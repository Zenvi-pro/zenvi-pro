import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_CURRENCY, normalizeCurrency } from "@shared/currency.ts";
import { detectCurrency } from "@/lib/detect-currency";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "zenvi.currency";

interface CurrencyContextValue {
  /** Currency to render prices in. */
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

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  locked: false,
  lockedReason: null,
});

function readStoredOverride(): string | null {
  try {
    return normalizeCurrency(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Safari private mode and similar. Detection still works, it just won't persist.
    return null;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<string | null>(readStoredOverride);
  const [profileCurrency, setProfileCurrency] = useState<string | null>(null);
  const [subscriptionCurrency, setSubscriptionCurrency] = useState<string | null>(null);

  // Environment signals are read once — they cannot change without a reload.
  const environment = useMemo(() => {
    let timeZone: string | null = null;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
      timeZone = null;
    }
    const languages = typeof navigator === "undefined"
      ? []
      : navigator.languages ?? (navigator.language ? [navigator.language] : []);
    return { timeZone, languages };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountSignals() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const [{ data: subscription }, { data: profile }] = await Promise.all([
        supabase.rpc("get_user_subscription"),
        supabase.from("profiles").select("preferred_currency").eq("id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const row = Array.isArray(subscription) && subscription.length > 0 ? subscription[0] : null;
      // Only a real Stripe subscription pins the currency. Free-tier rows carry no
      // stripe_subscription_id and must leave the picker usable.
      if (row?.stripe_subscription_id) {
        setSubscriptionCurrency(
          normalizeCurrency((row as { presentment_currency?: string }).presentment_currency)
            ?? DEFAULT_CURRENCY,
        );
      }
      setProfileCurrency(normalizeCurrency(profile?.preferred_currency));
    }

    loadAccountSignals().catch(() => {
      // Signed-out or offline: fall through to environment detection.
    });

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadAccountSignals().catch(() => {});
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const currency = detectCurrency({
    subscriptionCurrency,
    override,
    profileCurrency,
    timeZone: environment.timeZone,
    languages: environment.languages,
  });

  const setCurrency = useCallback((next: string) => {
    const normalized = normalizeCurrency(next);
    if (!normalized || subscriptionCurrency) return;

    setOverride(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // Non-fatal — the choice just won't survive a reload.
    }

    // Best effort, so the choice follows the user to another device.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      return supabase
        .from("profiles")
        .update({ preferred_currency: normalized })
        .eq("id", session.user.id);
    });
  }, [subscriptionCurrency]);

  const value = useMemo<CurrencyContextValue>(() => ({
    currency,
    setCurrency,
    locked: Boolean(subscriptionCurrency),
    lockedReason: subscriptionCurrency
      ? `Your subscription is billed in ${subscriptionCurrency.toUpperCase()}. Stripe can't change the currency of an active subscription.`
      : null,
  }), [currency, setCurrency, subscriptionCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
