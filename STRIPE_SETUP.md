# Stripe + Supabase setup checklist

Until you finish these 4 steps, the **Pay** button on `/pricing` won't do anything useful — every paid signup will fail. Steps 1–3 take about 15 minutes in total. Step 4 takes ~3 minutes once you have Stripe set up.

---

## Step 1 — Create products + prices in your Stripe dashboard

Go to https://dashboard.stripe.com/products → **+ Add product**. Create one product per plan, with two recurring prices on the subscription ones and a single one-time price for Lifetime:

| Product name | Price 1 (monthly) | Price 2 (annual) | Notes |
|---|---|---|---|
| Zenvi Starter | **$29 / month** | **$300 / year** | Trial: none. Tax behaviour: inclusive or exclusive per your jurisdiction. |
| Zenvi Pro | **$49 / month** | **$468 / year** | Same. |
| Zenvi Max | **$199 / month** | **$1,788 / year** | Same. |
| Zenvi Lifetime | **$99 one-time** | — | Set as one-time payment, not recurring. |

After creating each price, click into it and copy the `price_…` identifier from the URL or the price detail page. You'll need 7 price IDs total:

```
STRIPE_PRICE_STARTER_MONTHLY  =  price_...
STRIPE_PRICE_STARTER_ANNUAL   =  price_...
STRIPE_PRICE_PRO_MONTHLY      =  price_...
STRIPE_PRICE_PRO_ANNUAL       =  price_...
STRIPE_PRICE_MAX_MONTHLY      =  price_...
STRIPE_PRICE_MAX_ANNUAL       =  price_...
STRIPE_PRICE_LIFETIME         =  price_...
```

---

## Step 2 — Get your Stripe API keys

1. https://dashboard.stripe.com/apikeys → reveal your **Secret key** (starts with `sk_live_` for production or `sk_test_` for test mode). Copy it.
2. https://dashboard.stripe.com/webhooks → click **+ Add an endpoint**:
   - **Endpoint URL:** `https://xktarhzbrdnxkaovtdxj.supabase.co/functions/v1/stripe-webhook`
   - **Events to send:**
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
   - Click **Add endpoint**.
3. On the endpoint detail page, click **Reveal** under **Signing secret**. Copy that (starts with `whsec_`).

---

## Step 3 — Set every env var in Supabase project settings

Go to https://supabase.com/dashboard/project/xktarhzbrdnxkaovtdxj/settings/functions and add:

```
STRIPE_SECRET_KEY              = sk_live_… or sk_test_…
STRIPE_WEBHOOK_SECRET          = whsec_…
STRIPE_PRICE_STARTER_MONTHLY   = price_…
STRIPE_PRICE_STARTER_ANNUAL    = price_…
STRIPE_PRICE_PRO_MONTHLY       = price_…
STRIPE_PRICE_PRO_ANNUAL        = price_…
STRIPE_PRICE_MAX_MONTHLY       = price_…
STRIPE_PRICE_MAX_ANNUAL        = price_…
STRIPE_PRICE_LIFETIME          = price_…
```

After saving, the edge functions (`create-checkout-session`, `stripe-webhook`) pick these up on their next invocation — no redeploy needed.

---

## Step 4 — Deploy the edge functions

The functions are already in `supabase/functions/` in the repo. Push them with:

```bash
cd "/Users/nilaygoyal/Documents/Github/zenvi frontend website"
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal
supabase functions deploy stripe-webhook
```

(Run `supabase login` first if it prompts you.)

---

## Test it end-to-end

1. Open https://zenvi.pro/pricing in incognito.
2. Sign up as a brand-new user.
3. Click **Get Pro**.
4. Use Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC).
5. After success, you should land on `/checkout/success`.
6. Open `/dashboard/usage` — should show **5,500 credits** in the balance card and tier "Zenvi Pro".

If you don't see 5,500 cr immediately, the webhook hasn't fired yet — Stripe sometimes takes a few seconds. Refresh after ~10 seconds. If it's still wrong, check Stripe Dashboard → Webhooks → click your endpoint → look at recent deliveries. The error response (if any) tells you exactly which env var is missing or wrong.

---

## What happens when something goes wrong

Every Stripe webhook hit is logged in two places:

- **Stripe Dashboard → Webhooks → endpoint → Recent deliveries**: shows status + response. Easy first stop.
- **Supabase Dashboard → Edge Functions → stripe-webhook → Logs**: shows what the handler did. Any thrown error gets recorded against the event in the `stripe_webhook_events` table — query `SELECT * FROM stripe_webhook_events WHERE error IS NOT NULL ORDER BY processed_at DESC LIMIT 20;` from the SQL editor for a quick audit.
