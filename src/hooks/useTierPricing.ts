import { useEffect, useState, useCallback } from "react";
import { isStripeDevMode, stripeEdgeFunctionUrl, stripeEdgeHeaders } from "@/lib/stripe-edge";

export interface TierPriceDisplay {
  amount_cents: number;
  currency: string;
  display: string;
  period: string;
  monthly_equivalent_cents?: number;
  monthly_equivalent_display?: string;
  monthly_equivalent_period?: string;
}

export interface TierPricingData {
  tier: string;
  monthly_points: number;
  annual_monthly_points: number;
  seats: number;
  monthly: TierPriceDisplay | null;
  annual: TierPriceDisplay | null;
}

export type BillingInterval = "monthly" | "annual";

export function useTierPricing() {
  const [tiers, setTiers] = useState<Record<string, TierPricingData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          stripeEdgeFunctionUrl("get-tier-pricing"),
          {
            headers: stripeEdgeHeaders(),
            cache: isStripeDevMode ? "no-store" : "default",
          },
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error ?? `Failed to load pricing (HTTP ${res.status})`);
        }
        if (!cancelled) {
          setTiers(payload.tiers ?? {});
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load pricing");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const getPlanPrice = useCallback(
    (tier: string, interval: BillingInterval): TierPriceDisplay | null => {
      const row = tiers?.[tier];
      if (!row) return null;
      return interval === "annual" ? row.annual : row.monthly;
    },
    [tiers],
  );

  return { tiers, loading, error, getPlanPrice };
}
