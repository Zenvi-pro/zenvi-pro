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

function priceToTierAndInterval(priceId: string): { tier: string; interval: "monthly" | "annual" } {
  const map: Record<string, { tier: string; interval: "monthly" | "annual" }> = {
    [Deno.env.get("STRIPE_PRICE_CREATOR_MONTHLY") ?? "__none__"]: { tier: "creator", interval: "monthly" },
    [Deno.env.get("STRIPE_PRICE_CREATOR_ANNUAL") ?? "__none__"]: { tier: "creator", interval: "annual" },
    [Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") ?? "__none__"]: { tier: "pro", interval: "monthly" },
    [Deno.env.get("STRIPE_PRICE_PRO_ANNUAL") ?? "__none__"]: { tier: "pro", interval: "annual" },
    [Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY") ?? "__none__"]: { tier: "studio", interval: "monthly" },
    [Deno.env.get("STRIPE_PRICE_LIFETIME") ?? "__none__"]: { tier: "lifetime", interval: "monthly" },
  };
  return map[priceId] ?? { tier: "creator", interval: "monthly" };
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
              billing_interval: "lifetime",
            },
            { onConflict: "user_id" },
          );

          // Grant lifetime points allocation
          await supabase.rpc("allocate_monthly_points", {
            p_user_id: userId,
            p_tier: "lifetime",
            p_billing_interval: "lifetime",
          });

          await claimAccessCode(supabase, accessCode, userId);
          break;
        }

        // ── New subscription ─────────────────────────────────────────────────
        if (session.mode !== "subscription" || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        // Read user ID from subscription metadata first; fall back to session metadata
        // (session metadata is also set as of the latest version of create-checkout-session)
        const userId = sub.metadata.supabase_user_id ?? session.metadata?.supabase_user_id;
        const accessCode = sub.metadata.access_code ?? session.metadata?.access_code ?? "";
        if (!userId) break;

        const { tier, interval } = priceToTierAndInterval(sub.items.data[0].price.id);
        const billingInterval = sub.metadata.billing_interval ?? interval;

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: session.customer as string,
            tier,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            billing_interval: billingInterval,
          },
          { onConflict: "user_id" },
        );

        // Grant points for new subscription
        await supabase.rpc("allocate_monthly_points", {
          p_user_id: userId,
          p_tier: tier,
          p_billing_interval: billingInterval,
        });

        await claimAccessCode(supabase, accessCode, userId);
        break;
      }

      // ── Plan change / renewal / pause ──────────────────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata.supabase_user_id;
        if (!userId) break;

        const { tier, interval } = priceToTierAndInterval(sub.items.data[0].price.id);
        const billingInterval = sub.metadata.billing_interval ?? interval;

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
            tier,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            billing_interval: billingInterval,
          },
          { onConflict: "user_id" },
        );

        // Allocate points on renewal or plan change (only for active statuses)
        if (sub.status === "active" || sub.status === "trialing") {
          await supabase.rpc("allocate_monthly_points", {
            p_user_id: userId,
            p_tier: tier,
            p_billing_interval: billingInterval,
          });
        }
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
