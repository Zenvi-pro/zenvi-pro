/**
 * Currency helpers shared by the Supabase edge functions (Deno) and the web app (Vite).
 *
 * Deliberately free of remote imports and platform APIs so Deno, the browser and
 * vitest can all load this file directly. Keep it that way — anything that needs
 * the Stripe SDK belongs in tier-prices.ts.
 */

export interface SupportedCurrency {
  code: string;
  name: string;
  /** Short label for the currency picker. Not used for formatting — Intl does that. */
  label: string;
}

export const DEFAULT_CURRENCY = "usd";

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "usd", name: "US Dollar", label: "USD" },
  { code: "cad", name: "Canadian Dollar", label: "CAD" },
  { code: "eur", name: "Euro", label: "EUR" },
  { code: "gbp", name: "British Pound", label: "GBP" },
  { code: "aud", name: "Australian Dollar", label: "AUD" },
  { code: "inr", name: "Indian Rupee", label: "INR" },
  { code: "jpy", name: "Japanese Yen", label: "JPY" },
];

const SUPPORTED_CODES = new Set(SUPPORTED_CURRENCIES.map((c) => c.code));

/**
 * Stripe's zero-decimal currencies: amounts are whole units, so a `unit_amount`
 * of 4500 means ¥4,500 and not ¥45. Listed explicitly rather than derived from
 * Intl — this is Stripe's definition, and it must not shift with ICU data.
 */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

/**
 * Stripe's three-decimal currencies. None are offered today; the guard exists so
 * adding one later fails loudly in the amount math instead of silently by 1000x.
 */
export const THREE_DECIMAL_CURRENCIES = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

export function minorUnitExponent(currency: string): 0 | 2 | 3 {
  const code = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

/** Minor units (Stripe's `unit_amount`) to major units. Replaces a bare `/100`. */
export function minorToMajor(amountMinor: number, currency: string): number {
  const exponent = minorUnitExponent(currency);
  return exponent === 0 ? amountMinor : amountMinor / 10 ** exponent;
}

/** Major units to minor units, rounded to a whole minor unit as Stripe requires. */
export function majorToMinor(amountMajor: number, currency: string): number {
  const exponent = minorUnitExponent(currency);
  return Math.round(amountMajor * 10 ** exponent);
}

/**
 * Convert a minor-unit amount between currencies with differing minor units.
 *
 * `rate` is major target units per 1 major source unit (e.g. 1.3612 for usd→cad),
 * which is how FX quotes are conventionally expressed. Going through major units
 * is what keeps usd→jpy from being off by 100x.
 */
export function convertMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
): number {
  return majorToMinor(minorToMajor(amountMinor, fromCurrency) * rate, toCurrency);
}

/**
 * Format a minor-unit amount for display.
 *
 * `locale` is left undefined by default so Intl uses the runtime's own locale —
 * never pin one here. The catch-branch fallback emits the ISO code rather than a
 * bare "$", because a confidently wrong currency symbol is the exact class of bug
 * this module exists to prevent.
 */
export function formatMoney(amountMinor: number, currency: string, locale?: string): string {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  const exponent = minorUnitExponent(currency);
  const amount = minorToMajor(amountMinor, currency);

  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : exponent,
      maximumFractionDigits: exponent,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(exponent)}`;
  }
}

/** Validate untrusted input against the allowlist. Returns null on any miss. */
export function normalizeCurrency(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toLowerCase();
  return SUPPORTED_CODES.has(code) ? code : null;
}

export function isSupportedCurrency(code: unknown): boolean {
  return normalizeCurrency(code) !== null;
}

export function currencyMeta(code: string): SupportedCurrency | null {
  const normalized = normalizeCurrency(code);
  if (!normalized) return null;
  return SUPPORTED_CURRENCIES.find((c) => c.code === normalized) ?? null;
}
