import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICE_IDS: Record<string, string> = {
  creator_monthly: Deno.env.get("STRIPE_PRICE_CREATOR_MONTHLY") ?? "",
  creator_annual:  Deno.env.get("STRIPE_PRICE_CREATOR_ANNUAL")  ?? "",
  pro_monthly:     Deno.env.get("STRIPE_PRICE_PRO_MONTHLY")     ?? "",
  pro_annual:      Deno.env.get("STRIPE_PRICE_PRO_ANNUAL")      ?? "",
  studio_monthly:  Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY")  ?? "",
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { plan } = await req.json();
    const newPriceId = PRICE_IDS[plan];
    if (!newPriceId) return json({ error: `Unknown plan: ${plan}` }, 400);

    // Get their current subscription from DB
    const { data: subRows } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    const stripeSubId = subRows?.stripe_subscription_id;
    if (!stripeSubId) return json({ error: "No active subscription to upgrade." }, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Retrieve the current subscription to get the item ID
    const currentSub = await stripe.subscriptions.retrieve(stripeSubId);
    const itemId = currentSub.items.data[0]?.id;
    if (!itemId) return json({ error: "Could not find subscription item." }, 500);

    // Update the subscription — prorate immediately
    await stripe.subscriptions.update(stripeSubId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
    });

    // Webhook (customer.subscription.updated) will sync the DB

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
