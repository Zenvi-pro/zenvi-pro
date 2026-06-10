import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveStripePriceIdFromPlan, resolveTierName } from "../_shared/tier-prices.ts";
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

    const { plan } = await req.json();
    if (!plan) return json({ error: "Missing plan" }, 400);

    const { tier, interval, priceId } = await resolveStripePriceIdFromPlan(serviceSupabase, plan, req);
    if (!priceId) return json({ error: `No Stripe price configured for plan: ${plan}` }, 400);

    const { data: subRows } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    const stripeSubId = subRows?.stripe_subscription_id;
    if (!stripeSubId) {
      return json({ error: "No active subscription. Use checkout to subscribe." }, 409);
    }

    const stripe = createStripeClient(req);

    const currentSub = await stripe.subscriptions.retrieve(stripeSubId);
    const itemId = currentSub.items.data[0]?.id;
    if (!itemId) return json({ error: "Could not find subscription item." }, 500);

    await stripe.subscriptions.update(stripeSubId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: {
        ...currentSub.metadata,
        supabase_user_id: user.id,
        plan: String(resolveTierName(tier)),
        billing_interval: interval,
      },
    });

    return json({ success: true });
  } catch (err) {
    console.error("upgrade-subscription error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
