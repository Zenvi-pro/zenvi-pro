-- Sandbox Stripe price IDs for local/dev checkout against test mode keys.
ALTER TABLE public.tier_config
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id_sandbox TEXT,
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id_sandbox  TEXT;

COMMENT ON COLUMN public.tier_config.stripe_monthly_price_id_sandbox IS
  'Stripe test-mode Price ID (price_…) for monthly billing. Used when STRIPE_SECRET_KEY is sk_test_ or STRIPE_MODE=test.';
COMMENT ON COLUMN public.tier_config.stripe_annual_price_id_sandbox IS
  'Stripe test-mode Price ID (price_…) for annual billing. Used when STRIPE_SECRET_KEY is sk_test_ or STRIPE_MODE=test.';
