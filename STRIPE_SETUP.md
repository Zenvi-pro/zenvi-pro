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

## Test locally (sandbox)

1. `npm run dev` — frontend automatically sends `x-stripe-test-mode: true`.
2. Log in, enter a valid waitlist access code, complete checkout for Max.
3. Use test card `4242 4242 4242 4242`.
4. `/checkout/success` polls until `get_user_subscription` returns your tier, then redirects to `/download`.
5. `/dashboard` should show Max tier limits (not free-tier defaults).

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
