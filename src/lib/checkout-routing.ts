const FREE_TIERS = new Set(["none", "free", ""]);

export const TIER_ORDER: Record<string, number> = {
  none: 0,
  free: 0,
  starter: 1,
  creator: 1,
  pro: 2,
  max: 3,
  studio: 3,
};

export function normalizeTier(tier: string): string {
  if (tier === "creator") return "starter";
  if (tier === "studio") return "max";
  if (tier === "none") return "free";
  return tier;
}

export function hasActivePaidSubscription(tier: string): boolean {
  return !FREE_TIERS.has(normalizeTier(tier));
}

/** Compare current tier to a target paid tier (starter/pro/max). */
export function planChangeDirection(
  currentTier: string,
  targetTier: string,
): "same" | "upgrade" | "downgrade" | "new" {
  const current = TIER_ORDER[normalizeTier(currentTier)] ?? 0;
  const target = TIER_ORDER[normalizeTier(targetTier)] ?? 0;
  if (current === 0) return "new";
  if (target === current) return "same";
  return target > current ? "upgrade" : "downgrade";
}

export function buildCheckoutHref(
  planKey: string,
  currentTier: string,
  direction: "upgrade" | "downgrade" | "new",
): string {
  const base = `/checkout?plan=${planKey}`;
  if (direction !== "new" && hasActivePaidSubscription(currentTier)) {
    return `${base}&mode=${direction}`;
  }
  return base;
}

export function buildPaidPlanLoginHref(planKey: string): string {
  return `/login?next=${encodeURIComponent(`/checkout?plan=${planKey}`)}&mode=signup`;
}

/** Use upgrade-subscription API only for active Stripe paid subscribers changing tier. */
export function shouldUsePlanChangeApi(
  currentTier: string,
  targetTier: string,
  hasStripeSubscription: boolean,
): boolean {
  if (!hasStripeSubscription) return false;
  if (!hasActivePaidSubscription(currentTier)) return false;
  const direction = planChangeDirection(currentTier, targetTier);
  return direction === "upgrade" || direction === "downgrade";
}

const PLAN_KEY_TIER: Record<string, string> = {
  starter_monthly: "starter",
  starter_annual: "starter",
  pro_monthly: "pro",
  pro_annual: "pro",
  max_monthly: "max",
  max_annual: "max",
  creator_monthly: "starter",
  creator_annual: "starter",
  studio_monthly: "max",
  studio_annual: "max",
};

export function tierFromPlanKey(planKey: string): string | null {
  return PLAN_KEY_TIER[planKey] ?? null;
}

/** Clamp a checkout plan to the invite's max allowed tier (starter/pro/max). */
export function clampPlanKeyToAllowedTier(
  planKey: string,
  allowedTier: string | null,
): string {
  if (!allowedTier) return planKey;

  const requestedTier = tierFromPlanKey(planKey);
  if (!requestedTier) return planKey;

  const allowed = normalizeTier(allowedTier);
  const requested = normalizeTier(requestedTier);
  const allowedOrder = TIER_ORDER[allowed] ?? 0;
  const requestedOrder = TIER_ORDER[requested] ?? 0;

  if (allowedOrder === 0 || requestedOrder <= allowedOrder) return planKey;

  const interval = planKey.endsWith("_annual") ? "annual" : "monthly";
  return `${allowed}_${interval}`;
}
