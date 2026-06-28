-- tier_config: Stripe price IDs as SSOT for billing + display pricing
ALTER TABLE public.tier_config
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id  TEXT;

COMMENT ON COLUMN public.tier_config.stripe_monthly_price_id IS
  'Stripe Price ID (price_…) for monthly billing. NULL for free tier.';
COMMENT ON COLUMN public.tier_config.stripe_annual_price_id IS
  'Stripe Price ID (price_…) for annual billing. NULL for free tier.';

-- Remove legacy tiers not shown on the public pricing page.
-- _resolve_tier_name() still maps creator→starter and studio→max for existing subscribers.
DELETE FROM public.tier_config
WHERE tier IN ('creator', 'studio', 'lifetime');
