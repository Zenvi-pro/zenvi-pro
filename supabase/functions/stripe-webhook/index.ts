/**
 * Stripe webhook handler.
 *
 * Register this URL in Stripe Dashboard → Webhooks:
 *   https://<project>.supabase.co/functions/v1/stripe-webhook
 *
 * Events to subscribe to:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 */

import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function priceToTier(priceId: string): string {
  const map: Record<string, string> = {
    [Deno.env.get("STRIPE_PRICE_CREATOR") ?? "__none__"]: "creator",
    [Deno.env.get("STRIPE_PRICE_PRO") ?? "__none__"]: "pro",
    [Deno.env.get("STRIPE_PRICE_STUDIO") ?? "__none__"]: "studio",
    [Deno.env.get("STRIPE_PRICE_LIFETIME") ?? "__none__"]: "lifetime",
  };
  return map[priceId] ?? "creator";
}

/** Claim an access code for a user (service-role direct write, bypasses RLS). */
async function claimAccessCode(
  supabase: ReturnType<typeof createClient>,
  accessCode: string,
  userId: string,
) {
  if (!accessCode) return;
  await supabase
    .from("waitlist")
    .update({ used_by: userId, used_at: new Date().toISOString(), status: "used" })
    .eq("access_token", accessCode)
    .or(`used_by.is.null,used_by.eq.${userId}`);
}

Deno.serve(async (req) => {
  const missingVars: string[] = [];
  if (!Deno.env.get("STRIPE_SECRET_KEY")) missingVars.push("STRIPE_SECRET_KEY");
  if (!Deno.env.get("STRIPE_WEBHOOK_SECRET")) missingVars.push("STRIPE_WEBHOOK_SECRET");
  if (missingVars.length > 0) {
    console.error("stripe-webhook: missing env vars:", missingVars.join(", "));
    return new Response(JSON.stringify({ error: `Missing env vars: ${missingVars.join(", ")}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      // ── Checkout completed ─────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // ── Lifetime one-time purchase ───────────────────────────────────────
        if (session.mode === "payment") {
          const userId = session.metadata?.supabase_user_id;
          const accessCode = session.metadata?.access_code ?? "";
          if (!userId) break;

          await supabase.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_customer_id: session.customer as string,
              tier: "lifetime",
              status: "active",
              current_period_end: null,
              cancel_at_period_end: false,
            },
            { onConflict: "user_id" },
          );

          await claimAccessCode(supabase, accessCode, userId);
          break;
        }

        // ── New subscription ─────────────────────────────────────────────────
        if (session.mode !== "subscription" || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const userId = sub.metadata.supabase_user_id;
        const accessCode = sub.metadata.access_code ?? "";
        if (!userId) break;

        const tier = priceToTier(sub.items.data[0].price.id);

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: session.customer as string,
            tier,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          },
          { onConflict: "user_id" },
        );

        await claimAccessCode(supabase, accessCode, userId);
        break;
      }

      // ── Plan change / renewal / pause ──────────────────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata.supabase_user_id;
        if (!userId) break;

        const tier = priceToTier(sub.items.data[0].price.id);

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
            tier,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          },
          { onConflict: "user_id" },
        );
        break;
      }

      // ── Cancellation / expiry ──────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
    }
  } catch (err) {
    console.error(`Error handling event ${event.type}:`, err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
