import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICE_IDS: Record<string, string> = {
  creator: Deno.env.get("STRIPE_PRICE_CREATOR") ?? "",
  pro: Deno.env.get("STRIPE_PRICE_PRO") ?? "",
  studio: Deno.env.get("STRIPE_PRICE_STUDIO") ?? "",
  lifetime: Deno.env.get("STRIPE_PRICE_LIFETIME") ?? "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const missingVars: string[] = [];
  if (!Deno.env.get("STRIPE_SECRET_KEY")) missingVars.push("STRIPE_SECRET_KEY");
  if (!Deno.env.get("STRIPE_PRICE_CREATOR")) missingVars.push("STRIPE_PRICE_CREATOR");
  if (!Deno.env.get("STRIPE_PRICE_PRO")) missingVars.push("STRIPE_PRICE_PRO");
  if (!Deno.env.get("STRIPE_PRICE_STUDIO")) missingVars.push("STRIPE_PRICE_STUDIO");
  if (missingVars.length > 0) {
    return json({ error: `Missing env vars: ${missingVars.join(", ")}` }, 500);
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
    if (!priceId) return json({ error: `Unknown plan: ${plan}` }, 400);

    // ── Validate access code ─────────────────────────────────────────────────
    // Skip if user already has a claimed code (they're upgrading an existing account)
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

    // ── Create Checkout Session (no trial) ────────────────────────────────────
    const isLifetime = plan === "lifetime";
    const sharedMetadata = { supabase_user_id: user.id, plan, access_code: accessCode ?? "" };

    const session = await stripe.checkout.sessions.create(
      isLifetime
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
