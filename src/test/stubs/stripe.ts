/**
 * Test-only stand-in for `https://esm.sh/stripe@14.21.0`.
 *
 * The edge functions import that URL specifier, which Deno resolves at runtime but
 * vitest cannot. The pure helpers under test never construct a client — they only
 * need the module graph to load — so this stub exists purely to satisfy the import
 * in `_shared/stripe-env.ts`. See the `test.alias` entry in vite.config.ts.
 */
export default class Stripe {
  static createFetchHttpClient() {
    return {};
  }
}
