/**
 * Sets a CAD currency_options amount on every starter/pro/max Stripe Price, computed
 * from that Price's own live USD unit_amount and a live USD→CAD rate fetched at run
 * time — not a hand-maintained table, so it can never drift out of sync with the
 * actual USD prices in tier_config.
 *
 * Dry-run by default: prints the current vs. proposed CAD amount for every price and
 * writes nothing. Pass --apply to actually update Stripe.
 *
 * The rate is a live snapshot, not pinned — re-run this periodically (e.g. monthly)
 * to keep the CAD amount near the real exchange rate. Every run prints the rate and
 * timestamp used so a re-run's diff is self-explanatory.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... STRIPE_TEST_SECRET_KEY=sk_test_... \
 *     node scripts/stripe-set-currency-options.mjs --mode=test
 *   ... node scripts/stripe-set-currency-options.mjs --mode=test --apply
 *   SUPABASE_SERVICE_ROLE_KEY=... STRIPE_SECRET_KEY=sk_live_... \
 *     node scripts/stripe-set-currency-options.mjs --mode=live --apply
 */

const SUPABASE_URL = "https://xktarhzbrdnxkaovtdxj.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const mode = [...args].find((a) => a.startsWith("--mode="))?.split("=")[1] ?? "test";

if (mode !== "test" && mode !== "live") {
  console.error(`Invalid --mode=${mode}; expected "test" or "live"`);
  process.exit(1);
}

const STRIPE_SECRET_KEY = mode === "live"
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}
if (!STRIPE_SECRET_KEY) {
  console.error(`Missing ${mode === "live" ? "STRIPE_SECRET_KEY" : "STRIPE_TEST_SECRET_KEY"} env var`);
  process.exit(1);
}
if (mode === "live" && !STRIPE_SECRET_KEY.startsWith("sk_live_")) {
  console.error("--mode=live requires an sk_live_ key (got a non-live-looking key). Refusing to continue.");
  process.exit(1);
}
if (mode === "test" && !STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("--mode=test requires an sk_test_ key (got a non-test-looking key). Refusing to continue.");
  process.exit(1);
}

const TIERS = ["starter", "pro", "max"];
const PRICE_COLS = mode === "live"
  ? { monthly: "stripe_monthly_price_id", annual: "stripe_annual_price_id" }
  : { monthly: "stripe_monthly_price_id_sandbox", annual: "stripe_annual_price_id_sandbox" };

async function fetchTierConfig() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tier_config?select=tier,${PRICE_COLS.monthly},${PRICE_COLS.annual}&tier=in.(${TIERS.join(",")})`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`tier_config fetch failed: ${JSON.stringify(data)}`);
  return data;
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${STRIPE_SECRET_KEY}:`).toString("base64")}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${path} failed: ${data?.error?.message ?? JSON.stringify(data)}`);
  return data;
}

async function stripeUpdateCadOption(priceId, unitAmount) {
  const res = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${STRIPE_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `currency_options[cad][unit_amount]=${unitAmount}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`update ${priceId} failed: ${data?.error?.message ?? JSON.stringify(data)}`);
  return data;
}

async function fetchUsdToCadRate() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await res.json();
  if (!res.ok || data.result !== "success" || typeof data.rates?.CAD !== "number") {
    throw new Error(`FX rate fetch failed: ${JSON.stringify(data)}`);
  }
  return { rate: data.rates.CAD, asOf: data.time_last_update_utc };
}

(async () => {
  console.log(`Mode: ${mode}${apply ? " (APPLYING)" : " (dry run — pass --apply to write)"}\n`);

  const { rate, asOf } = await fetchUsdToCadRate();
  console.log(`USD→CAD rate: ${rate} (as of ${asOf})\n`);

  const rows = await fetchTierConfig();

  // Read everything and compute the full plan before writing anything, so a bad
  // price ID aborts the whole run instead of leaving some tiers updated and others not.
  const plan = [];
  for (const row of rows) {
    for (const interval of ["monthly", "annual"]) {
      const priceId = row[PRICE_COLS[interval]];
      if (!priceId) {
        throw new Error(`${row.tier}/${interval}: no ${PRICE_COLS[interval]} in tier_config`);
      }
      const price = await stripeGet(`/prices/${priceId}?expand[]=currency_options`);
      if (price.currency !== "usd") {
        throw new Error(`${row.tier}/${interval} (${priceId}) is not USD-denominated (${price.currency}) — refusing to guess`);
      }
      const currentCad = price.currency_options?.cad?.unit_amount ?? null;
      const proposedCad = Math.round(price.unit_amount * rate);
      plan.push({ tier: row.tier, interval, priceId, usd: price.unit_amount, currentCad, proposedCad });
    }
  }

  console.log("tier      interval   price               usd     current cad   proposed cad");
  for (const p of plan) {
    console.log(
      `${p.tier.padEnd(9)} ${p.interval.padEnd(10)} ${p.priceId.padEnd(19)} ${String(p.usd).padStart(6)}  ${String(p.currentCad ?? "—").padStart(11)}  ${String(p.proposedCad).padStart(13)}`,
    );
  }

  if (!apply) {
    console.log("\nDry run only — nothing written. Re-run with --apply to update Stripe.");
    return;
  }

  console.log("\nApplying...");
  for (const p of plan) {
    await stripeUpdateCadOption(p.priceId, p.proposedCad);
    console.log(`  ✓ ${p.tier}/${p.interval} (${p.priceId}) → cad ${p.proposedCad}`);
  }
  console.log("\nDone.");
})().catch((err) => {
  console.error("\nAborted:", err.message);
  process.exit(1);
});
