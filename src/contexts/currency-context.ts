import { createContext } from "react";
import { DEFAULT_CURRENCY } from "@shared/currency.ts";

export interface CurrencyContextValue {
  /** Currency the visitor has selected or been detected into. */
  currency: string;
  /** Persist an explicit choice. No-op while locked. */
  setCurrency: (currency: string) => void;
  /**
   * True once an active subscription pins the currency. Stripe will not change a
   * running subscription's currency, so the picker must not imply otherwise.
   */
  locked: boolean;
  lockedReason: string | null;
}

/**
 * Kept apart from the provider component so the provider file exports only a
 * component (Fast Refresh) and the hook can live under src/hooks/.
 */
export const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  locked: false,
  lockedReason: null,
});
