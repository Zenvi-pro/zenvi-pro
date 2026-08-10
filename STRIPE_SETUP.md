# Stripe + Supabase setup checklist

Until you finish these steps, paid checkout will not sync subscriptions to Supabase. Local dev (`npm run dev`) uses **Stripe test mode** and requires a **separate test webhook** endpoint.

---

## Step 1 — Create products + prices in Stripe

Go to https://dashboard.stripe.com/products and create Starter, Pro, and Max with monthly + annual recurring prices.

Price IDs are stored in Supabase `tier_config` (not env vars):

| Column | Used when |
|--------|-----------|
| `stripe_monthly_price_id` / `stripe_annual_price_id` | Production (`zenvi.pro`) |
| `stripe_monthly_price_id_sandbox` / `stripe_annual_price_id_sandbox` | Local dev (`npm run dev`) |

Sandbox IDs for starter/max are seeded by migrations. Set live IDs and any missing sandbox IDs in the Supabase SQL editor:

```sql
UPDATE tier_config SET stripe_monthly_price_id = 'price_...' WHERE tier = 'starter';
-- repeat for pro, max, annual columns, and sandbox columns as needed
```

---

## Step 2 — Webhook endpoints (test + live)

**Production (live mode):** https://dashboard.stripe.com/webhooks

**Local dev (test mode):** toggle **Test mode** in Stripe, then https://dashboard.stripe.com/test/webhooks

Both endpoints use the same URL:

`https://xktarhzbrdnxkaovtdxj.supabase.co/functions/v1/stripe-webhook`

**Events to enable:**

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

Copy each endpoint's **Signing secret** (`whsec_…`). Test and live endpoints have different secrets.

---

## Step 3 — Supabase Edge Function secrets

Go to https://supabase.com/dashboard/project/xktarhzbrdnxkaovtdxj/settings/functions

| Secret | Required for |
|--------|----------------|
| `STRIPE_SECRET_KEY` | Production checkout + live webhooks |
| `STRIPE_WEBHOOK_SECRET` | Live webhook signature verification |
| `STRIPE_TEST_SECRET_KEY` | Local dev checkout (`sk_test_…`) |
| `STRIPE_TEST_WEBHOOK_SECRET` | Test webhook signature verification |

Or via CLI from the repo root:

```bash
supabase secrets set STRIPE_TEST_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_TEST_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Secrets are picked up on the next function invocation — no redeploy required after changing secrets only.

---

## Step 4 — Deploy edge functions

```bash
cd zenvi-pro
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal
supabase functions deploy upgrade-subscription
supabase functions deploy stripe-webhook
supabase functions deploy get-tier-pricing
```

---

## Multi-currency

Customers are billed in their own currency so their bank never converts. Two
mechanisms, in priority order:

1. **Hand-set `currency_options`** on the tier prices — an exact, charm-rounded local
   amount. `/pricing` shows precisely what Stripe will charge.
2. **Adaptive Pricing** (Dashboard toggle, *Settings → Payments → Adaptive Pricing*)
   for every other currency. Stripe picks the rate, guarantees it for 24h, and
   critically **refunds at the original transaction's rate** so a refund returns the
   exact amount paid. Manual `currency_options` override it for those currencies only.

Currencies live in `supabase/functions/_shared/currency.ts` (the allowlist) and in
`scripts/stripe-set-currency-options.mjs` (the amounts). To add or reprice one, edit
the script's `PRICE_TABLE` and re-run:

```bash
# dry run — prints a diff, writes nothing
STRIPE_TEST_SECRET_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/stripe-set-currency-options.mjs --mode=test
# apply, then repeat with --mode=live
... node scripts/stripe-set-currency-options.mjs --mode=test --apply
```

The script refuses to run if the table disagrees with a price's live USD amount, and
aborts rather than half-applying. **Every tier and interval must offer the same
currency set** — Stripe will not move a subscription to a price lacking its currency,
so a partial rollout breaks plan changes for anyone in the missing one.

Two properties that are easy to break:

- `prices.retrieve` needs `expand: ["currency_options"]`. Without it the field is
  `undefined` and every currency silently collapses to USD.
- `get-tier-pricing` returns an identical body to every caller and is cached publicly
  for an hour. Do not add a per-caller dimension (query param, header, geo lookup)
  without fixing the cache key, or one visitor's currency is served to another.

A Stripe **Customer is locked** to the currency of its first subscription. Switching
requires cancelling and re-subscribing on a *new* Customer, then updating
`profiles.stripe_customer_id`.

Settlement matters as much as presentment: a currency you charge in but don't settle
in gets converted by Stripe at your cost. Check *Settings → Bank accounts and
currencies* against the currencies in `PRICE_TABLE`.

---

## Test locally (sandbox)

1. `npm run dev` — frontend automatically sends `x-stripe-test-mode: true`.
2. Log in, enter a valid waitlist access code, complete checkout for Max.
3. Use test card `4242 4242 4242 4242`.
4. `/checkout/success` polls until `get_user_subscription` returns your tier, then redirects to `/download`.
5. `/dashboard` should show Max tier limits (not free-tier defaults).

To exercise a non-USD flow, sign up with a `+location_CA@example.com` style address —
Stripe uses the tag to simulate customer location for Adaptive Pricing. Confirm the
Checkout page shows CAD, then that `subscriptions.presentment_currency` is `cad`.

If the subscription row is missing after ~30s:

- **Stripe Dashboard → Webhooks (test mode) → Recent deliveries** — 400 means wrong `STRIPE_TEST_WEBHOOK_SECRET`; 500 means handler error (check edge function logs).
- **Supabase SQL:** `SELECT * FROM stripe_webhook_events ORDER BY processed_at DESC LIMIT 20;`

---

## Debugging

| Symptom | Likely cause |
|---------|----------------|
| Webhook 400 | Missing or wrong test/live `whsec_` secret |
| Webhook 500, then never retries | Old idempotency bug — redeploy latest `stripe-webhook` |
| Checkout 400 "No Stripe price configured" | Sandbox price ID null in `tier_config` |
| Paid in Stripe, free in UI | Webhook never succeeded — check deliveries + `subscriptions` table |
