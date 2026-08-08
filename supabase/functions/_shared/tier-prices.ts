import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type Stripe from "https://esm.sh/stripe@14.21.0";
import { isStripeTestMode } from "./stripe-env.ts";
import { formatMoney, minorUnitExponent } from "./currency.ts";

export type BillingInterval = "monthly" | "annual";
export type CanonicalTier = "free" | "starter" | "pro" | "max";

export interface TierConfigRow {
  tier: string;
  monthly_points: number;
  annual_monthly_points: number;
  seats: number;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  stripe_monthly_price_id_sandbox: string | null;
  stripe_annual_price_id_sandbox: string | null;
}

export interface PriceDisplay {
  amount_cents: number;
  currency: string;
  display: string;
  period: string;
  /** 0 for zero-decimal currencies. Lets the client reformat without its own table. */
  minor_unit_exponent: number;
  monthly_equivalent_cents?: number;
  monthly_equivalent_display?: string;
  monthly_equivalent_period?: string;
}

/**
 * A price rendered in every currency it is offered in.
 *
 * `currencies` is built from the Stripe Price's `currency_options`, so it is the
 * authoritative list of what a customer can actually be charged. Currencies absent
 * here fall through to Stripe Adaptive Pricing at checkout.
 */
export interface MultiCurrencyPriceDisplay {
  default_currency: string;
  currencies: Record<string, PriceDisplay>;
}

export interface TierPriceLookup {
  priceId: string;
  tier: CanonicalTier;
  interval: BillingInterval;
}

const CANONICAL_TIERS: CanonicalTier[] = ["free", "starter", "pro", "max"];

const TIER_CONFIG_SELECT =
  "tier, monthly_points, annual_monthly_points, seats, stripe_monthly_price_id, stripe_annual_price_id, stripe_monthly_price_id_sandbox, stripe_annual_price_id_sandbox";

/** True when edge functions should use tier_config sandbox price ID columns. */
export function isStripeSandboxMode(req?: Request): boolean {
  return isStripeTestMode(req);
}

/** Mirrors public._resolve_tier_name() in Postgres. */
export function resolveTierName(tier: string): CanonicalTier | string {
  const t = (tier ?? "free").toLowerCase();
  if (t === "creator") return "starter";
  if (t === "studio") return "max";
  if (t === "none") return "free";
  return t;
}

/** Parse plan key e.g. starter_monthly → { tier, interval }. */
export function parsePlanKey(plan: string): { tier: string; interval: BillingInterval } {
  if (plan.endsWith("_annual")) {
    return { tier: plan.replace(/_annual$/, ""), interval: "annual" };
  }
  return { tier: plan.replace(/_monthly$/, ""), interval: "monthly" };
}

/**
 * Server-side canonical formatting. The client re-formats in its own locale from
 * `amount_cents` + `currency`; this string is the fallback for anything that can't.
 */
export function formatCents(amountCents: number, currency: string): string {
  return formatMoney(amountCents, currency);
}

/** Active Stripe price ID for checkout/pricing (sandbox vs live). */
export function stripePriceIdForRow(
  row: TierConfigRow,
  interval: BillingInterval,
  req?: Request,
): string | null {
  const sandbox = isStripeSandboxMode(req);
  if (interval === "annual") {
    return sandbox
      ? row.stripe_annual_price_id_sandbox
      : row.stripe_annual_price_id;
  }
  return sandbox
    ? row.stripe_monthly_price_id_sandbox
    : row.stripe_monthly_price_id;
}

export async function loadTierConfigRows(
  supabase: SupabaseClient,
): Promise<TierConfigRow[]> {
  const { data, error } = await supabase
    .from("tier_config")
    .select(TIER_CONFIG_SELECT)
    .in("tier", CANONICAL_TIERS)
    .order("tier");

  if (error) throw new Error(`Failed to load tier_config: ${error.message}`);
  return (data ?? []) as TierConfigRow[];
}

/** Register live + sandbox price IDs so webhooks resolve either mode. */
export async function loadTierPriceLookups(
  supabase: SupabaseClient,
): Promise<TierPriceLookup[]> {
  const rows = await loadTierConfigRows(supabase);
  const lookups: TierPriceLookup[] = [];
  const seen = new Set<string>();

  const add = (priceId: string | null, tier: CanonicalTier, interval: BillingInterval) => {
    if (!priceId || seen.has(priceId)) return;
    seen.add(priceId);
    lookups.push({ priceId, tier, interval });
  };

  for (const row of rows) {
    const tier = row.tier as CanonicalTier;
    add(row.stripe_monthly_price_id, tier, "monthly");
    add(row.stripe_annual_price_id, tier, "annual");
    add(row.stripe_monthly_price_id_sandbox, tier, "monthly");
    add(row.stripe_annual_price_id_sandbox, tier, "annual");
  }

  return lookups;
}

export function buildPriceIdMap(
  lookups: TierPriceLookup[],
): Map<string, { tier: CanonicalTier; interval: BillingInterval }> {
  const map = new Map<string, { tier: CanonicalTier; interval: BillingInterval }>();
  for (const entry of lookups) {
    map.set(entry.priceId, { tier: entry.tier, interval: entry.interval });
  }
  return map;
}

export async function resolveStripePriceId(
  supabase: SupabaseClient,
  tier: string,
  interval: BillingInterval,
  req?: Request,
): Promise<string | null> {
  const resolved = resolveTierName(tier);
  const rows = await loadTierConfigRows(supabase);
  const row = rows.find((r) => r.tier === resolved);
  if (!row) return null;
  return stripePriceIdForRow(row, interval, req);
}

export async function resolveStripePriceIdFromPlan(
  supabase: SupabaseClient,
  plan: string,
  req?: Request,
): Promise<{ tier: string; interval: BillingInterval; priceId: string | null }> {
  const { tier, interval } = parsePlanKey(plan);
  const priceId = await resolveStripePriceId(supabase, tier, interval, req);
  return { tier: String(resolveTierName(tier)), interval, priceId };
}

/** Render one amount in one currency. `recurringInterval` comes from the Price. */
export function buildPriceDisplay(
  amountCents: number,
  currency: string,
  recurringInterval: string | undefined,
): PriceDisplay {
  const base: PriceDisplay = {
    amount_cents: amountCents,
    currency,
    display: formatCents(amountCents, currency),
    period: recurringInterval === "year" ? "/yr" : recurringInterval === "month" ? "/mo" : "",
    minor_unit_exponent: minorUnitExponent(currency),
  };

  if (recurringInterval !== "year") return base;

  // Display-only figure: it is never charged, and 12x it will not always equal the
  // annual price. Rounding happens in minor units, so zero-decimal currencies are fine.
  const monthlyEquivalentCents = Math.round(amountCents / 12);
  return {
    ...base,
    monthly_equivalent_cents: monthlyEquivalentCents,
    monthly_equivalent_display: formatCents(monthlyEquivalentCents, currency),
    monthly_equivalent_period: "/mo",
  };
}

/**
 * Fetch a price rendered in every currency it offers.
 *
 * `currency_options` is an expandable field — without the explicit `expand` it comes
 * back undefined and every currency silently collapses to the default. That failure
 * is invisible in the response shape, so do not remove it.
 */
export async function fetchStripePriceDisplays(
  stripe: Stripe,
  priceId: string,
): Promise<MultiCurrencyPriceDisplay | null> {
  const price = await stripe.prices.retrieve(priceId, { expand: ["currency_options"] });
  if (price.unit_amount == null) return null;

  const recurringInterval = price.recurring?.interval;
  const currencies: Record<string, PriceDisplay> = {
    [price.currency]: buildPriceDisplay(price.unit_amount, price.currency, recurringInterval),
  };

  const options = (price.currency_options ?? {}) as Record<string, { unit_amount: number | null }>;
  for (const [currency, option] of Object.entries(options)) {
    if (currency === price.currency || option?.unit_amount == null) continue;
    currencies[currency] = buildPriceDisplay(option.unit_amount, currency, recurringInterval);
  }

  return { default_currency: price.currency, currencies };
}

export function tierAndIntervalFromMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): { tier: CanonicalTier; interval: BillingInterval } | null {
  if (!metadata) return null;
  const rawTier = metadata.plan ?? metadata.tier;
  if (!rawTier) return null;
  const tier = resolveTierName(rawTier) as CanonicalTier;
  const rawInterval = metadata.billing_interval;
  const interval: BillingInterval =
    rawInterval === "annual" ? "annual" : "monthly";
  return { tier, interval };
}

export function tierAndIntervalFromPriceId(
  priceId: string,
  priceMap: Map<string, { tier: CanonicalTier; interval: BillingInterval }>,
): { tier: CanonicalTier; interval: BillingInterval } {
  return priceMap.get(priceId) ?? { tier: "starter", interval: "monthly" };
}
