import { useEffect, useState, useCallback } from "react";
import { isStripeDevMode, stripeEdgeFunctionUrl, stripeEdgeHeaders } from "@/lib/stripe-edge";
import { DEFAULT_CURRENCY, formatMoney } from "@shared/currency.ts";
import { useCurrency } from "@/contexts/CurrencyContext";

export interface TierPriceDisplay {
  amount_cents: number;
  currency: string;
  display: string;
  period: string;
  minor_unit_exponent: number;
  monthly_equivalent_cents?: number;
  monthly_equivalent_display?: string;
  monthly_equivalent_period?: string;
}

export interface MultiCurrencyPrice {
  default_currency: string;
  currencies: Record<string, TierPriceDisplay>;
}

export interface TierPricingData {
  tier: string;
  monthly_points: number;
  annual_monthly_points: number;
  seats: number;
  monthly: MultiCurrencyPrice | null;
  annual: MultiCurrencyPrice | null;
}

export type BillingInterval = "monthly" | "annual";

/**
 * Re-render the server's canonical string in the visitor's own locale. The server
 * formats with no locale (it has none), so this is a strictly better rendering when
 * the amount and currency are present.
 */
function localize(price: TierPriceDisplay): TierPriceDisplay {
  try {
    return {
      ...price,
      display: formatMoney(price.amount_cents, price.currency, navigator.language),
      monthly_equivalent_display: price.monthly_equivalent_cents == null
        ? price.monthly_equivalent_display
        : formatMoney(price.monthly_equivalent_cents, price.currency, navigator.language),
    };
  } catch {
    return price;
  }
}

export function useTierPricing() {
  const { currency } = useCurrency();
  const [tiers, setTiers] = useState<Record<string, TierPricingData> | null>(null);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([DEFAULT_CURRENCY]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deliberately fires once: the payload carries every currency, so switching
  // currency is a local lookup rather than a refetch.
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
          setSupportedCurrencies(payload.supported_currencies ?? [DEFAULT_CURRENCY]);
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
      const price = interval === "annual" ? row.annual : row.monthly;
      if (!price) return null;
      // Fall back to the price's own default rather than showing nothing — a currency
      // we don't have an exact amount for is handled by Adaptive Pricing at checkout.
      const selected = price.currencies[currency] ?? price.currencies[price.default_currency];
      return selected ? localize(selected) : null;
    },
    [tiers, currency],
  );

  return { tiers, loading, error, getPlanPrice, supportedCurrencies, currency };
}
