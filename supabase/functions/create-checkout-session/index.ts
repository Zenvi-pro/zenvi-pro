import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan keys map to Stripe price IDs configured in the project env.
//
// New (canonical) plan keys: starter | pro | max  × monthly | annual
// Legacy keys (creator, studio) are accepted so older client builds keep
// working through the renaming window — they resolve to the same Stripe
// price IDs as their renamed siblings.
const PRICE_IDS: Record<string, string> = {
  // Canonical tier names (post-rename)
  starter_monthly: Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_CREATOR_MONTHLY") ?? "",
  starter_annual:  Deno.env.get("STRIPE_PRICE_STARTER_ANNUAL")  ?? Deno.env.get("STRIPE_PRICE_CREATOR_ANNUAL")  ?? "",
  pro_monthly:     Deno.env.get("STRIPE_PRICE_PRO_MONTHLY")     ?? "",
  pro_annual:      Deno.env.get("STRIPE_PRICE_PRO_ANNUAL")      ?? "",
  max_monthly:     Deno.env.get("STRIPE_PRICE_MAX_MONTHLY")     ?? Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY") ?? "",
  max_annual:      Deno.env.get("STRIPE_PRICE_MAX_ANNUAL")      ?? "",
  // Lifetime: one-time purchase (unchanged)
  lifetime:        Deno.env.get("STRIPE_PRICE_LIFETIME")        ?? "",
  // Legacy keys (preserved for in-flight client builds — alias to canonical)
  creator_monthly: Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_CREATOR_MONTHLY") ?? "",
  creator_annual:  Deno.env.get("STRIPE_PRICE_STARTER_ANNUAL")  ?? Deno.env.get("STRIPE_PRICE_CREATOR_ANNUAL")  ?? "",
  studio_monthly:  Deno.env.get("STRIPE_PRICE_MAX_MONTHLY")     ?? Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY") ?? "",
};

/** Map a plan key to the canonical tier_config tier name we write to DB. */
function planToTier(plan: string): string {
  if (plan === "lifetime") return "lifetime";
  // strip _monthly / _annual suffix
  const base = plan.replace(/_monthly$|_annual$/, "");
  // legacy → canonical
  if (base === "creator") return "starter";
  if (base === "studio")  return "max";
  return base;  // starter, pro, max
}

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
    const { plan, accessCode, successUrl, cancelUrl } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return json({ error: `No Stripe price configured for plan: ${plan}. Set the STRIPE_PRICE_${plan.toUpperCase()} environment variable in Supabase.` }, 400);
    }

    // Derive tier and billing_interval from plan key
    const isLifetimePlan = plan === "lifetime";
    const billingInterval: "monthly" | "annual" | "lifetime" = plan.endsWith("_annual")
      ? "annual"
      : plan === "lifetime"
        ? "lifetime"
        : "monthly";
    const tier = planToTier(plan);

    // ── Validate access code ─────────────────────────────────────────────────
    const { data: hasAccess } = await supabase.rpc("get_user_download_access");

    if (!hasAccess) {
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
            allow_promotion_codes: true,
            metadata: sharedMetadata,
          }
        : {
            customer: customerId,
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
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
