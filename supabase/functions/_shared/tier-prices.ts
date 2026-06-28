import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type Stripe from "https://esm.sh/stripe@14.21.0";
import { isStripeTestMode } from "./stripe-env.ts";

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
  monthly_equivalent_cents?: number;
  monthly_equivalent_display?: string;
  monthly_equivalent_period?: string;
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

export function formatCents(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
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

export async function fetchStripePriceDisplay(
  stripe: Stripe,
  priceId: string,
): Promise<PriceDisplay | null> {
  const price = await stripe.prices.retrieve(priceId);
  if (price.unit_amount == null) return null;

  const currency = price.currency;
  const amountCents = price.unit_amount;
  const recurring = price.recurring;

  if (recurring?.interval === "year") {
    const monthlyEquivalentCents = Math.round(amountCents / 12);
    return {
      amount_cents: amountCents,
      currency,
      display: formatCents(amountCents, currency),
      period: "/yr",
      monthly_equivalent_cents: monthlyEquivalentCents,
      monthly_equivalent_display: formatCents(monthlyEquivalentCents, currency),
      monthly_equivalent_period: "/mo",
    };
  }

  if (recurring?.interval === "month") {
    return {
      amount_cents: amountCents,
      currency,
      display: formatCents(amountCents, currency),
      period: "/mo",
    };
  }

  return {
    amount_cents: amountCents,
    currency,
    display: formatCents(amountCents, currency),
    period: "",
  };
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
