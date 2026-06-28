import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: customerId } = await supabase.rpc("get_stripe_customer_id");
    if (!customerId) return json({ error: "No billing account found." }, 404);

    const stripe = createStripeClient(req);

    const { returnUrl } = await req.json().catch(() => ({}));

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? "https://zenvi.pro/dashboard",
    });

    return json({ url: portalSession.url });
  } catch (err) {
    console.error("create-billing-portal error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
