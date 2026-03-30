import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICE_IDS: Record<string, string> = {
  creator_monthly: Deno.env.get("STRIPE_PRICE_CREATOR_MONTHLY") ?? "",
  creator_annual: Deno.env.get("STRIPE_PRICE_CREATOR_ANNUAL") ?? "",
  pro_monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") ?? "",
  pro_annual: Deno.env.get("STRIPE_PRICE_PRO_ANNUAL") ?? "",
  studio_monthly: Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY") ?? "",
  lifetime: Deno.env.get("STRIPE_PRICE_LIFETIME") ?? "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    return json({ error: "Missing env var: STRIPE_SECRET_KEY" }, 500);
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // ── Parse body ────────────────────────────────────────────────────────────
    const { plan, accessCode, promoCode, successUrl, cancelUrl } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return json({ error: `No Stripe price configured for plan: ${plan}. Set the STRIPE_PRICE_${plan.toUpperCase()} environment variable in Supabase.` }, 400);
    }

    // Normalize promo code
    const normalizedPromo = (promoCode ?? "").trim().toLowerCase();
    const isHarkit = normalizedPromo === "harkit";

    // Derive tier and billing_interval from plan key
    const isLifetimePlan = plan === "lifetime";
    const billingInterval: "monthly" | "annual" | "lifetime" = plan.endsWith("_annual")
      ? "annual"
      : plan === "lifetime"
        ? "lifetime"
        : "monthly";
    const tier = isLifetimePlan ? "lifetime" : plan.replace(/_monthly$|_annual$/, "");

    // ── Validate access code ─────────────────────────────────────────────────
    // Skip if: user already has a claimed code, OR user is using the Harkit promo
    const { data: hasAccess } = await supabase.rpc("get_user_download_access");

    if (!hasAccess && !isHarkit) {
      if (!accessCode) {
        return json({ error: "An access code is required to subscribe." }, 403);
      }
      const { data: tokenData, error: tokenError } = await supabase.rpc(
        "validate_waitlist_token",
        { token: accessCode },
      );
      if (tokenError || !tokenData || tokenData.length === 0) {
        return json({ error: "Invalid or already used access code." }, 403);
      }
    }

    // ── Stripe ────────────────────────────────────────────────────────────────
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("profiles").upsert({ id: user.id, stripe_customer_id: customerId });
    }

    // ── Harkit promo: create or retrieve 100% off coupon ──────────────────────
    let harkitCouponId: string | undefined;
    if (isHarkit && isLifetimePlan) {
      try {
        const existing = await stripe.coupons.retrieve("HARKIT");
        harkitCouponId = existing.id;
      } catch {
        // Coupon doesn't exist yet — create it
        try {
          const coupon = await stripe.coupons.create({
            id: "HARKIT",
            percent_off: 100,
            duration: "once",
            name: "HARKIT — Founder Access",
          });
          harkitCouponId = coupon.id;
        } catch {
          // id "HARKIT" already taken by a deleted coupon; create without custom id
          const coupon = await stripe.coupons.create({
            percent_off: 100,
            duration: "once",
            name: "HARKIT — Founder Access",
          });
          harkitCouponId = coupon.id;
        }
      }
    }

    // ── Create Checkout Session ────────────────────────────────────────────────
    const sharedMetadata = {
      supabase_user_id: user.id,
      plan: tier,
      billing_interval: billingInterval,
      access_code: accessCode ?? "",
    };

    const session = await stripe.checkout.sessions.create(
      isLifetimePlan
        ? {
            customer: customerId,
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "payment",
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: sharedMetadata,
            // Apply Harkit coupon directly (makes total $0, no card required).
            // When no promo, allow Stripe-native promo code entry instead.
            ...(harkitCouponId
              ? { discounts: [{ coupon: harkitCouponId }] }
              : { allow_promotion_codes: true }),
          }
        : {
            customer: customerId,
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
            // Metadata at session level AND subscription level so the webhook
            // can read it from either the session or the retrieved subscription.
            metadata: sharedMetadata,
            subscription_data: {
              metadata: sharedMetadata,
            },
          },
    );

    return json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
