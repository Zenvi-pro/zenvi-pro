import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isStripeSandboxMode, resolveStripePriceIdFromPlan } from "../_shared/tier-prices.ts";
import { createStripeClient, STRIPE_CORS_HEADERS } from "../_shared/stripe-env.ts";

const CORS = {
  ...STRIPE_CORS_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { plan, accessCode, successUrl, cancelUrl } = await req.json();
    if (!plan || typeof plan !== "string") {
      return json({ error: "Missing plan" }, 400);
    }

    const { tier, interval, priceId } = await resolveStripePriceIdFromPlan(serviceSupabase, plan, req);
    if (!priceId) {
      const col = isStripeSandboxMode(req)
        ? `stripe_${interval}_price_id_sandbox`
        : `stripe_${interval}_price_id`;
      return json({
        error: `No Stripe price configured for plan: ${plan}. Set ${col} on tier_config for tier '${tier}'.`,
      }, 400);
    }

    const billingInterval = interval;

    let resolvedCode = accessCode;
    if (!resolvedCode) {
      const { data: claimedToken } = await supabase.rpc("get_user_claimed_waitlist_token");
      if (claimedToken) resolvedCode = String(claimedToken);
    }

    if (!resolvedCode) {
      return json({ error: "An access code is required to subscribe." }, 403);
    }

    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "validate_waitlist_token",
      { token: resolvedCode },
    );
    if (tokenError || !tokenData || tokenData.length === 0) {
      return json({ error: "Invalid or already used access code." }, 403);
    }

    const { data: planAllowed, error: planError } = await supabase.rpc(
      "validate_token_for_plan",
      { token: resolvedCode, target_tier: tier },
    );
    if (planError || !planAllowed) {
      return json({
        error: "This access code is not valid for the selected plan. Check your invite tier.",
      }, 403);
    }

    const stripe = createStripeClient(req);

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

    const sharedMetadata = {
      supabase_user_id: user.id,
      plan: tier,
      billing_interval: billingInterval,
      access_code: resolvedCode ?? "",
    };

    const session = await stripe.checkout.sessions.create({
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
    });

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
