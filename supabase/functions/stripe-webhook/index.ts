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
 *   - invoice.payment_succeeded   (NEW — used for cycle refills)
 *
 * Stripe price → tier mapping is driven by env vars in Supabase project
 * settings. Both canonical (STRIPE_PRICE_STARTER_*, _MAX_*) and legacy
 * (STRIPE_PRICE_CREATOR_*, _STUDIO_*) names are accepted so the rename
 * can roll out gradually. priceToTierAndInterval always returns the
 * canonical tier name written to the subscriptions table.
 *
 * Idempotency:
 *   record_stripe_event(stripe_event_id, type, payload) is called FIRST
 *   on every webhook hit. If it returns false the event has already been
 *   processed and we return 200 without doing the work again.
 */

import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Tier = "starter" | "pro" | "max" | "lifetime";
type Interval = "monthly" | "annual" | "lifetime";

function priceToTierAndInterval(priceId: string): { tier: Tier; interval: Interval } {
  const env = (k: string) => Deno.env.get(k) ?? "__none__";

  // Canonical mapping (post-rename)
  const map: Record<string, { tier: Tier; interval: Interval }> = {
    [env("STRIPE_PRICE_STARTER_MONTHLY")]: { tier: "starter", interval: "monthly" },
    [env("STRIPE_PRICE_STARTER_ANNUAL")]:  { tier: "starter", interval: "annual"  },
    [env("STRIPE_PRICE_PRO_MONTHLY")]:     { tier: "pro",     interval: "monthly" },
    [env("STRIPE_PRICE_PRO_ANNUAL")]:      { tier: "pro",     interval: "annual"  },
    [env("STRIPE_PRICE_MAX_MONTHLY")]:     { tier: "max",     interval: "monthly" },
    [env("STRIPE_PRICE_MAX_ANNUAL")]:      { tier: "max",     interval: "annual"  },
    [env("STRIPE_PRICE_LIFETIME")]:        { tier: "lifetime", interval: "lifetime" },
    // Legacy price IDs map onto the canonical tier names
    [env("STRIPE_PRICE_CREATOR_MONTHLY")]: { tier: "starter", interval: "monthly" },
    [env("STRIPE_PRICE_CREATOR_ANNUAL")]:  { tier: "starter", interval: "annual"  },
    [env("STRIPE_PRICE_STUDIO_MONTHLY")]:  { tier: "max",     interval: "monthly" },
  };
  return map[priceId] ?? { tier: "starter", interval: "monthly" };
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

  // ── Idempotency gate ──────────────────────────────────────────────────────
  // record_stripe_event inserts (event_id, type, payload) into
  // stripe_webhook_events. Returns true if newly inserted, false if duplicate.
  // We use the result to short-circuit duplicate deliveries from Stripe
  // (which DO happen — Stripe retries on any non-2xx, and network blips can
  // produce duplicate 2xx ACKs after the original was already processed).
  try {
    const { data: inserted, error: idempErr } = await supabase.rpc("record_stripe_event", {
      p_event_id:   event.id,
      p_event_type: event.type,
      p_payload:    event.data.object as unknown,
    });
    if (idempErr) {
      console.warn("stripe-webhook: idempotency log write failed:", idempErr);
      // Fall through — better to risk a duplicate write than miss the event
    } else if (inserted === false) {
      console.log("stripe-webhook: duplicate event %s — already processed", event.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.warn("stripe-webhook: idempotency check error (continuing):", e);
  }

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
        const userId = sub.metadata.supabase_user_id ?? session.metadata?.supabase_user_id;
        const accessCode = sub.metadata.access_code ?? session.metadata?.access_code ?? "";
        if (!userId) break;

        const { tier, interval } = priceToTierAndInterval(sub.items.data[0].price.id);
        const billingInterval = (sub.metadata.billing_interval as Interval) ?? interval;

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

        await supabase.rpc("allocate_monthly_points", {
          p_user_id: userId,
          p_tier: tier,
          p_billing_interval: billingInterval,
        });

        await claimAccessCode(supabase, accessCode, userId);
        break;
      }

      // ── Plan change / pause / cancel-at-period-end change ─────────────────
      // Note: this fires on RENEWALS too, but we no longer call
      // allocate_monthly_points here — that's moved to invoice.payment_succeeded
      // so renewals only refill credits when a real payment lands.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata.supabase_user_id;
        if (!userId) break;

        const { tier, interval } = priceToTierAndInterval(sub.items.data[0].price.id);
        const billingInterval = (sub.metadata.billing_interval as Interval) ?? interval;

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
        // No point allocation here — handled by invoice.payment_succeeded
        break;
      }

      // ── Cycle renewal: payment landed → refill credits ─────────────────────
      // Fires on first invoice AND on every renewal. We allocate points
      // only on real successful payment so a card decline doesn't grant
      // free credits and a paused-then-resumed subscription doesn't
      // accidentally hand out a second allocation.
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;  // not a subscription invoice

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const userId = sub.metadata.supabase_user_id;
        if (!userId) break;

        const { tier, interval } = priceToTierAndInterval(sub.items.data[0].price.id);
        const billingInterval = (sub.metadata.billing_interval as Interval) ?? interval;

        await supabase.rpc("allocate_monthly_points", {
          p_user_id: userId,
          p_tier: tier,
          p_billing_interval: billingInterval,
        });
        break;
      }

      // ── Cancellation / expiry ──────────────────────────────────────────────
      // Mark subscription canceled but leave existing credits intact — the
      // user paid for them and can use them through current_period_end.
      // A nightly cron should zero subscription_points after period_end if
      // status='canceled' (Phase 9 reconciliation job).
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
    // Record the error against the idempotency row so we have a trail
    try {
      await supabase
        .from("stripe_webhook_events")
        .update({ error: (err as Error).message })
        .eq("stripe_event_id", event.id);
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
