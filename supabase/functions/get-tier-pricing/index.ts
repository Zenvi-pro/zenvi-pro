import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchStripePriceDisplay,
  isStripeSandboxMode,
  loadTierConfigRows,
  stripePriceIdForRow,
  type PriceDisplay,
} from "../_shared/tier-prices.ts";
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

    await Promise.all(
      rows.map(async (row) => {
        let monthly: PriceDisplay | null = null;
        let annual: PriceDisplay | null = null;

        const monthlyPriceId = stripePriceIdForRow(row, "monthly", req);
        const annualPriceId = stripePriceIdForRow(row, "annual", req);

        if (monthlyPriceId) {
          try {
            monthly = await fetchStripePriceDisplay(stripe, monthlyPriceId);
          } catch (err) {
            console.error(`get-tier-pricing: monthly price ${monthlyPriceId}:`, err);
          }
        }

        if (annualPriceId) {
          try {
            annual = await fetchStripePriceDisplay(stripe, annualPriceId);
          } catch (err) {
            console.error(`get-tier-pricing: annual price ${annualPriceId}:`, err);
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

    const cacheControl = sandbox
      ? "no-store, no-cache, must-revalidate"
      : "public, max-age=3600";

    return new Response(JSON.stringify({ tiers, stripe_mode: sandbox ? "test" : "live" }), {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/json",
        "Cache-Control": cacheControl,
      },
    });
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
