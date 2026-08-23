import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchPriceCurrencies,
  isStripeSandboxMode,
  resolveStripePriceIdFromPlan,
} from "../_shared/tier-prices.ts";
import { createStripeClient, STRIPE_CORS_HEADERS } from "../_shared/stripe-env.ts";
import { normalizeCurrency } from "../_shared/currency.ts";

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

    const { plan, accessCode, successUrl, cancelUrl, currency: requestedCurrency } = await req.json();
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
    let customerCurrency: string | null = null;

    if (customerId) {
      // A Customer is locked to a currency by its first subscription, invoice or
      // discount. Forcing a different one on the session fails with "You cannot
      // combine currencies on a single customer", so read it and defer to it.
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if ("deleted" in customer && customer.deleted) {
          // Stripe rejects a deleted Customer ID outright on a new Checkout
          // Session — fall through to creating a replacement below, same as a
          // profile that never had one.
          customerId = undefined;
        } else {
          customerCurrency = normalizeCurrency(customer.currency) ?? null;
        }
      } catch (err) {
        console.warn(`create-checkout-session: customer ${customerId} unreadable:`, err);
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("profiles").upsert({ id: user.id, stripe_customer_id: customerId });
    }

    // Resolve the currency to present. Anything the price cannot be billed in is
    // dropped so Stripe Adaptive Pricing can localize instead — forcing it would be
    // rejected outright.
    const { defaultCurrency, currencies } = await fetchPriceCurrencies(stripe, priceId);
    let effectiveCurrency = normalizeCurrency(requestedCurrency);

    if (customerCurrency && customerCurrency !== effectiveCurrency) {
      console.warn(
        `create-checkout-session: customer ${customerId} is locked to ${customerCurrency}, ` +
        `overriding requested ${effectiveCurrency ?? "(none)"}`,
      );
      effectiveCurrency = customerCurrency;
    }
    if (effectiveCurrency && !currencies.has(effectiveCurrency)) {
      effectiveCurrency = customerCurrency && currencies.has(customerCurrency)
        ? customerCurrency
        : null;
    }

    const sharedMetadata = {
      supabase_user_id: user.id,
      plan: tier,
      billing_interval: billingInterval,
      access_code: resolvedCode ?? "",
      requested_currency: effectiveCurrency ?? "adaptive",
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      // Left explicit: Adaptive Pricing only supports card, Link and the wallets for
      // cross-border subscriptions, so dynamic payment methods would buy nothing here.
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      // Omitting `currency` is what lets Adaptive Pricing localize; setting it opts out
      // for this session in favour of our own currency_options amount.
      ...(effectiveCurrency ? { currency: effectiveCurrency } : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      // Gives Stripe a billing country, which it otherwise has no way to infer, and
      // persists it back onto the Customer for future sessions and tax.
      billing_address_collection: "required",
      customer_update: { address: "auto" },
      metadata: sharedMetadata,
      subscription_data: {
        metadata: sharedMetadata,
      },
    });

    // Echoed so the UI can explain a currency it did not ask for rather than showing
    // one price and charging another.
    return json({
      url: session.url,
      currency: effectiveCurrency,
      default_currency: defaultCurrency,
      currency_locked: Boolean(customerCurrency),
    });
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
