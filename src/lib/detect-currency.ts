import { DEFAULT_CURRENCY, normalizeCurrency } from "@shared/currency.ts";

/**
 * Pick the currency to *display* prices in.
 *
 * Pure by design — every signal is passed in rather than read from a global, so the
 * precedence ladder is testable. The browser wiring lives in CurrencyContext.
 *
 * This only decides presentation. Stripe decides what is actually charged, and an
 * active subscription's currency is immutable, which is why it outranks everything.
 */

const EUROZONE = "eur";

/** Country (ISO 3166-1 alpha-2) to currency, restricted to what we support. */
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "usd",
  CA: "cad",
  GB: "gbp",
  AU: "aud",
  IN: "inr",
  JP: "jpy",
  // Eurozone
  AD: EUROZONE, AT: EUROZONE, BE: EUROZONE, CY: EUROZONE, DE: EUROZONE,
  EE: EUROZONE, ES: EUROZONE, FI: EUROZONE, FR: EUROZONE, GR: EUROZONE,
  HR: EUROZONE, IE: EUROZONE, IT: EUROZONE, LT: EUROZONE, LU: EUROZONE,
  LV: EUROZONE, MC: EUROZONE, ME: EUROZONE, MT: EUROZONE, NL: EUROZONE,
  PT: EUROZONE, SI: EUROZONE, SK: EUROZONE, SM: EUROZONE, VA: EUROZONE,
};

/**
 * IANA timezone to country, covering only the countries whose currency we support.
 *
 * Timezone beats language as a location signal: a Canadian browser very often reports
 * `en-US`, but reliably reports `America/Toronto`. Europe/* is deliberately enumerated
 * rather than prefix-matched — London, Zurich, Oslo, Stockholm, Warsaw and Prague are
 * all Europe/* and none of them are the euro.
 */
const TIMEZONE_COUNTRY: Record<string, string> = {
  // Canada
  "America/Toronto": "CA", "America/Montreal": "CA", "America/Vancouver": "CA",
  "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA",
  "America/St_Johns": "CA", "America/Regina": "CA", "America/Moncton": "CA",
  "America/Whitehorse": "CA", "America/Yellowknife": "CA", "America/Iqaluit": "CA",
  "America/Thunder_Bay": "CA", "America/Rankin_Inlet": "CA", "America/Resolute": "CA",
  "America/Dawson_Creek": "CA", "America/Glace_Bay": "CA", "America/Goose_Bay": "CA",
  // United Kingdom
  "Europe/London": "GB", "Europe/Belfast": "GB",
  // India
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  // Japan
  "Asia/Tokyo": "JP",
  // Eurozone
  "Europe/Vienna": "AT", "Europe/Brussels": "BE", "Europe/Zagreb": "HR",
  "Asia/Nicosia": "CY", "Europe/Nicosia": "CY", "Europe/Tallinn": "EE",
  "Europe/Helsinki": "FI", "Europe/Paris": "FR", "Europe/Berlin": "DE",
  "Europe/Busingen": "DE", "Europe/Athens": "GR", "Europe/Dublin": "IE",
  "Europe/Rome": "IT", "Europe/Riga": "LV", "Europe/Vilnius": "LT",
  "Europe/Luxembourg": "LU", "Europe/Malta": "MT", "Europe/Amsterdam": "NL",
  "Europe/Lisbon": "PT", "Atlantic/Azores": "PT", "Atlantic/Madeira": "PT",
  "Europe/Bratislava": "SK", "Europe/Ljubljana": "SI", "Europe/Madrid": "ES",
  "Africa/Ceuta": "ES", "Atlantic/Canary": "ES", "Europe/Andorra": "AD",
  "Europe/Monaco": "MC", "Europe/Podgorica": "ME", "Europe/San_Marino": "SM",
  "Europe/Vatican": "VA",
};

/** Timezone prefixes that map cleanly to one country. */
const TIMEZONE_PREFIX_COUNTRY: Array<[string, string]> = [
  ["Australia/", "AU"],
  ["US/", "US"],
  ["America/Indiana/", "US"],
  ["America/Kentucky/", "US"],
  ["America/North_Dakota/", "US"],
];

export function countryForTimeZone(timeZone: string | null | undefined): string | null {
  if (!timeZone) return null;
  const tz = timeZone.trim();
  if (TIMEZONE_COUNTRY[tz]) return TIMEZONE_COUNTRY[tz];
  for (const [prefix, country] of TIMEZONE_PREFIX_COUNTRY) {
    if (tz.startsWith(prefix)) return country;
  }
  return null;
}

export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_CURRENCY[country.trim().toUpperCase()] ?? null;
}

export function currencyForTimeZone(timeZone: string | null | undefined): string | null {
  return currencyForCountry(countryForTimeZone(timeZone));
}

/** Pull the first usable region subtag out of navigator.languages (`en-CA` → CA). */
export function countryForLanguages(
  languages: readonly string[] | null | undefined,
): string | null {
  if (!languages) return null;
  for (const tag of languages) {
    const region = tag?.split("-")[1];
    if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();
  }
  return null;
}

export interface DetectCurrencyInput {
  /** Currency of an active Stripe subscription. Immutable, so it wins outright. */
  subscriptionCurrency?: string | null;
  /** Explicit user selection, from localStorage. */
  override?: string | null;
  /** profiles.preferred_currency, so the choice follows the user across devices. */
  profileCurrency?: string | null;
  /** Intl.DateTimeFormat().resolvedOptions().timeZone */
  timeZone?: string | null;
  /** navigator.languages */
  languages?: readonly string[] | null;
}

/**
 * Narrow a detected currency to one the tiers are actually priced in.
 *
 * detectCurrency answers "what would this visitor like to see", which can be a
 * currency the catalogue does not offer. This answers "what can we actually show",
 * keeping the picker, the price lookup and the billing label on a single value.
 */
export function resolveOfferedCurrency(
  currency: string,
  supported: readonly string[],
): string {
  if (supported.includes(currency)) return currency;
  if (supported.includes(DEFAULT_CURRENCY)) return DEFAULT_CURRENCY;
  return supported[0] ?? DEFAULT_CURRENCY;
}

export function detectCurrency(input: DetectCurrencyInput = {}): string {
  return (
    normalizeCurrency(input.subscriptionCurrency) ??
    normalizeCurrency(input.override) ??
    normalizeCurrency(input.profileCurrency) ??
    normalizeCurrency(currencyForTimeZone(input.timeZone)) ??
    normalizeCurrency(currencyForCountry(countryForLanguages(input.languages))) ??
    DEFAULT_CURRENCY
  );
}
