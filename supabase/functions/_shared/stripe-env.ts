import Stripe from "https://esm.sh/stripe@14.21.0";

/** Sent by the Vite dev server (npm run dev) to select test Stripe keys. */
export const STRIPE_TEST_MODE_HEADER = "x-stripe-test-mode";

function requestWantsTestMode(req: Request): boolean | null {
  try {
    const url = new URL(req.url);
    const qp = url.searchParams.get("stripe_test");
    if (qp === "true" || qp === "1") return true;
    if (qp === "false" || qp === "0") return false;
  } catch {
    /* ignore */
  }

  const header = req.headers.get(STRIPE_TEST_MODE_HEADER);
  if (header === "true" || header === "1") return true;
  if (header === "false" || header === "0") return false;

  return null;
}

export function isStripeTestMode(req?: Request): boolean {
  const mode = Deno.env.get("STRIPE_MODE")?.toLowerCase();
  if (mode === "test" || mode === "sandbox") return true;
  if (mode === "live" || mode === "production") return false;

  if (req) {
    const fromRequest = requestWantsTestMode(req);
    if (fromRequest !== null) return fromRequest;
  }

  return false;
}

export function getStripeSecretKey(testMode: boolean): string {
  if (testMode) {
    const testKey = Deno.env.get("STRIPE_TEST_SECRET_KEY");
    if (!testKey) {
      throw new Error("Missing env var: STRIPE_TEST_SECRET_KEY (required for Stripe test mode)");
    }
    return testKey;
  }

  const liveKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!liveKey) {
    throw new Error("Missing env var: STRIPE_SECRET_KEY");
  }
  return liveKey;
}

export function getStripeSecretKeyFromRequest(req?: Request): string {
  return getStripeSecretKey(isStripeTestMode(req));
}

export function createStripeClient(req?: Request): Stripe {
  return new Stripe(getStripeSecretKeyFromRequest(req), {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function createStripeClientForMode(testMode: boolean): Stripe {
  return new Stripe(getStripeSecretKey(testMode), {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

const CORS_STRIPE_HEADER = "x-stripe-test-mode";

export const STRIPE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    `authorization, x-client-info, apikey, content-type, ${CORS_STRIPE_HEADER}`,
};

/** Verify webhook signature against live and/or test signing secrets. */
export async function constructStripeWebhookEvent(
  body: string,
  signature: string,
): Promise<{ event: Stripe.Event; testMode: boolean }> {
  const candidates: { secret: string; testMode: boolean }[] = [];
  const liveSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const testSecret = Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET");
  if (liveSecret) candidates.push({ secret: liveSecret, testMode: false });
  if (testSecret) candidates.push({ secret: testSecret, testMode: true });

  if (candidates.length === 0) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET or STRIPE_TEST_WEBHOOK_SECRET");
  }

  const stripe = createStripeClientForMode(false);
  let lastError: unknown;

  for (const { secret, testMode } of candidates) {
    try {
      const event = await stripe.webhooks.constructEventAsync(body, signature, secret);
      return { event, testMode: !event.livemode };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Webhook signature verification failed");
}
