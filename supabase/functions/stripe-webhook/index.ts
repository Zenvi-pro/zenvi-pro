/**
 * Stripe webhook handler.
 *
 * Stripe price → tier mapping is driven by tier_config.stripe_*_price_id columns.
 * Price ID is preferred over subscription metadata (metadata can be stale after upgrades).
 */

import type Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildPriceIdMap,
  loadTierPriceLookups,
  tierAndIntervalFromMetadata,
  tierAndIntervalFromPriceId,
  type BillingInterval,
  type CanonicalTier,
} from "../_shared/tier-prices.ts";
import {
  constructStripeWebhookEvent,
  createStripeClientForMode,
} from "../_shared/stripe-env.ts";

type Interval = BillingInterval | "lifetime";
type SupabaseAdmin = ReturnType<typeof createClient>;

function subscriptionPeriodEndIso(sub: Stripe.Subscription): string | null {
  const unix = sub.current_period_end
    ?? sub.items?.data?.[0]?.current_period_end
    ?? null;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

function resolveTierAndInterval(
  metadata: Record<string, string | undefined> | null | undefined,
  priceId: string,
  priceMap: Map<string, { tier: CanonicalTier; interval: BillingInterval }>,
): { tier: CanonicalTier | "lifetime"; interval: Interval } {
  if (priceId) {
    const fromPrice = tierAndIntervalFromPriceId(priceId, priceMap);
    if (priceMap.has(priceId)) {
      return { tier: fromPrice.tier, interval: fromPrice.interval };
    }
  }
  const fromMeta = tierAndIntervalFromMetadata(metadata);
  if (fromMeta) {
    return { tier: fromMeta.tier, interval: fromMeta.interval };
  }
  const fromPrice = tierAndIntervalFromPriceId(priceId, priceMap);
  return { tier: fromPrice.tier, interval: fromPrice.interval };
}

async function resolveUserId(
  supabase: SupabaseAdmin,
  metadata: Record<string, string | undefined> | null | undefined,
  stripeCustomerId: string | null | undefined,
): Promise<string | null> {
  const fromMeta = metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;

  if (!stripeCustomerId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  return profile?.id ?? null;
}

async function claimAccessCode(
  supabase: SupabaseAdmin,
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
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  let testMode: boolean;
  try {
    const verified = await constructStripeWebhookEvent(body, sig);
    event = verified.event;
    testMode = verified.testMode;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const stripe = createStripeClientForMode(testMode);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const priceLookups = await loadTierPriceLookups(supabase);
  const priceMap = buildPriceIdMap(priceLookups);

  try {
    const { data: alreadyProcessed } = await supabase
      .from("stripe_webhook_events")
      .select("stripe_event_id, error")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (alreadyProcessed && !alreadyProcessed.error) {
      console.log("stripe-webhook: duplicate event %s — already processed", event.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment") {
          const userId = await resolveUserId(
            supabase,
            session.metadata,
            session.customer as string,
          );
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

        if (session.mode !== "subscription" || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const userId = await resolveUserId(
          supabase,
          sub.metadata ?? session.metadata,
          (session.customer ?? sub.customer) as string,
        );
        const accessCode = sub.metadata.access_code ?? session.metadata?.access_code ?? "";
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id ?? "";
        const { tier, interval } = resolveTierAndInterval(
          sub.metadata ?? session.metadata,
          priceId,
          priceMap,
        );
        const billingInterval = (sub.metadata.billing_interval as Interval) ?? interval;

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: session.customer as string,
            tier,
            status: sub.status,
            current_period_end: subscriptionPeriodEndIso(sub),
            cancel_at_period_end: sub.cancel_at_period_end,
            billing_interval: billingInterval,
          },
          { onConflict: "user_id" },
        );

        if (session.customer) {
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: session.customer as string })
            .eq("id", userId);
        }

        await supabase.rpc("allocate_monthly_points", {
          p_user_id: userId,
          p_tier: tier,
          p_billing_interval: billingInterval,
        });

        await claimAccessCode(supabase, accessCode, userId);
        console.log("stripe-webhook: checkout.session.completed user=%s tier=%s", userId, tier);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(supabase, sub.metadata, sub.customer as string);
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id ?? "";
        const { tier, interval } = resolveTierAndInterval(sub.metadata, priceId, priceMap);
        const billingInterval = (sub.metadata.billing_interval as Interval) ?? interval;

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
            tier,
            status: sub.status,
            current_period_end: subscriptionPeriodEndIso(sub),
            cancel_at_period_end: sub.cancel_at_period_end,
            billing_interval: billingInterval,
          },
          { onConflict: "user_id" },
        );
        console.log("stripe-webhook: customer.subscription.updated user=%s tier=%s", userId, tier);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const userId = await resolveUserId(supabase, sub.metadata, sub.customer as string);
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id ?? "";
        const { tier, interval } = resolveTierAndInterval(sub.metadata, priceId, priceMap);
        const billingInterval = (sub.metadata.billing_interval as Interval) ?? interval;

        await supabase.rpc("allocate_monthly_points", {
          p_user_id: userId,
          p_tier: tier,
          p_billing_interval: billingInterval,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
    }

    const { data: inserted, error: idempErr } = await supabase.rpc("record_stripe_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload: event.data.object as unknown,
    });
    if (idempErr) {
      console.warn("stripe-webhook: idempotency log write failed:", idempErr);
    } else if (alreadyProcessed?.error && inserted === false) {
      await supabase
        .from("stripe_webhook_events")
        .update({ error: null, processed_at: new Date().toISOString() })
        .eq("stripe_event_id", event.id);
    }
  } catch (err) {
    console.error(`Error handling event ${event.type} (${event.id}):`, err);
    try {
      await supabase
        .from("stripe_webhook_events")
        .update({ error: (err as Error).message })
        .eq("stripe_event_id", event.id);
    } catch { /* ignore — event may not have been recorded yet */ }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
