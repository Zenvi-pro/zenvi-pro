import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchStripePriceDisplays,
  isStripeSandboxMode,
  loadTierConfigRows,
  stripePriceIdForRow,
  type MultiCurrencyPriceDisplay,
} from "../_shared/tier-prices.ts";
import { DEFAULT_CURRENCY, normalizeCurrency } from "../_shared/currency.ts";
import { createStripeClient, STRIPE_CORS_HEADERS } from "../_shared/stripe-env.ts";

const CORS = {
  ...STRIPE_CORS_HEADERS,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const stripe = createStripeClient(req);
    const rows = await loadTierConfigRows(supabase);
    const sandbox = isStripeSandboxMode(req);
    const tiers: Record<string, unknown> = {};
    const offered = new Set<string>();

    await Promise.all(
      rows.map(async (row) => {
        let monthly: MultiCurrencyPriceDisplay | null = null;
        let annual: MultiCurrencyPriceDisplay | null = null;

        const monthlyPriceId = stripePriceIdForRow(row, "monthly", req);
        const annualPriceId = stripePriceIdForRow(row, "annual", req);

        if (monthlyPriceId) {
          try {
            monthly = await fetchStripePriceDisplays(stripe, monthlyPriceId);
          } catch (err) {
            console.error(`get-tier-pricing: monthly price ${monthlyPriceId}:`, err);
          }
        }

        if (annualPriceId) {
          try {
            annual = await fetchStripePriceDisplays(stripe, annualPriceId);
          } catch (err) {
            console.error(`get-tier-pricing: annual price ${annualPriceId}:`, err);
          }
        }

        for (const price of [monthly, annual]) {
          for (const currency of Object.keys(price?.currencies ?? {})) {
            if (normalizeCurrency(currency)) offered.add(currency);
          }
        }

        tiers[row.tier] = {
          tier: row.tier,
          monthly_points: row.monthly_points,
          annual_monthly_points: row.annual_monthly_points,
          seats: row.seats,
          monthly,
          annual,
        };
      }),
    );

    // Only advertise a currency every paid tier can actually be billed in. Stripe will
    // not move a subscription to a price that lacks its currency, so offering one that
    // a single tier is missing would break plan changes for anyone who picked it.
    const paidTiers = rows.filter((row) => row.tier !== "free");
    const supported = [...offered].filter((currency) =>
      paidTiers.every((row) => {
        const tier = tiers[row.tier] as {
          monthly: MultiCurrencyPriceDisplay | null;
          annual: MultiCurrencyPriceDisplay | null;
        };
        return Boolean(tier?.monthly?.currencies[currency] && tier?.annual?.currencies[currency]);
      })
    ).sort();

    const cacheControl = sandbox
      ? "no-store, no-cache, must-revalidate"
      : "public, max-age=3600";

    // The body is identical for every caller — currency selection happens client-side
    // from this payload. That is what keeps the shared public cache safe; do not add a
    // per-caller dimension (query param, header, or geo lookup) without also fixing the
    // cache key, or one visitor's currency will be served to another for an hour.
    return new Response(
      JSON.stringify({
        tiers,
        supported_currencies: supported.length > 0 ? supported : [DEFAULT_CURRENCY],
        default_currency: DEFAULT_CURRENCY,
        stripe_mode: sandbox ? "test" : "live",
      }),
      {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
          "Cache-Control": cacheControl,
        },
      },
    );
  } catch (err) {
    console.error("get-tier-pricing error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
