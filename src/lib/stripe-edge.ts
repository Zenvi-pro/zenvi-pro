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

/** Append stripe_test=1 when running via npm run dev (query param survives Supabase gateway). */
export function stripeEdgeFunctionUrl(functionName: string): string {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  if (!isStripeDevMode) return base;
  return `${base}?stripe_test=1`;
}
