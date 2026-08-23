/** True when Vite dev server is running (`npm run dev`). */
export const isStripeDevMode = import.meta.env.DEV;

const STRIPE_TEST_MODE_HEADER = "x-stripe-test-mode";

/** Headers for Supabase edge function calls (satisfies gateway JWT check). */
export function stripeEdgeHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const result: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    ...headers,
  };
  if (isStripeDevMode) {
    result[STRIPE_TEST_MODE_HEADER] = "true";
  }
  return result;
}

/**
 * Build a Supabase edge function URL.
 *
 * Appends stripe_test=1 when running via npm run dev (the query param survives the
 * Supabase gateway, unlike a custom header on a GET). Callers must pass extra query
 * params through `params` rather than concatenating a "?" themselves — in dev the
 * base already carries one, and `?stripe_test=1?foo=bar` silently swallows foo.
 */
export function stripeEdgeFunctionUrl(
  functionName: string,
  params?: Record<string, string>,
): string {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  const search = new URLSearchParams(params);
  if (isStripeDevMode) search.set("stripe_test", "1");
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
