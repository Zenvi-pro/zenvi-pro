-- Fix tier_limits: add lifetime + studio, correct limits to match actual plan pricing.
-- Also update check_usage_allowed so any active paying subscriber without a tier_limits
-- row gets a high fallback limit instead of the $2 default.

INSERT INTO public.tier_limits (tier, monthly_usd_limit, description) VALUES
  ('lifetime', 500.00, 'Lifetime access — unlimited chat, high safety cap'),
  ('studio',   200.00, 'Studio plan — $199/mo (corrected)')
ON CONFLICT (tier) DO UPDATE SET
  monthly_usd_limit = EXCLUDED.monthly_usd_limit,
  description       = EXCLUDED.description;

-- Also correct the existing tiers to match actual plan prices
UPDATE public.tier_limits SET monthly_usd_limit = 30.00,  description = 'Creator plan — $29/mo'  WHERE tier = 'creator';
UPDATE public.tier_limits SET monthly_usd_limit = 100.00, description = 'Pro plan — $99/mo'      WHERE tier = 'pro';

-- Update check_usage_allowed: if the user has an active paid subscription but their
-- tier isn't in tier_limits, use a $100 fallback instead of the $2 default.
CREATE OR REPLACE FUNCTION public.check_usage_allowed(p_estimated_cost NUMERIC DEFAULT 0)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier          TEXT;
  v_limit         NUMERIC(10,2);
  v_current_spend NUMERIC(10,6) := 0;
BEGIN
  SELECT s.tier INTO v_tier
  FROM subscriptions s
  WHERE s.user_id = auth.uid() AND s.status IN ('active', 'trialing')
  LIMIT 1;

  SELECT tl.monthly_usd_limit INTO v_limit
  FROM tier_limits tl
  WHERE tl.tier = coalesce(v_tier, 'none');

  -- Fallback: paying subscriber whose tier isn't in tier_limits gets $100
  IF v_limit IS NULL THEN
    v_limit := CASE WHEN v_tier IS NOT NULL THEN 100.00 ELSE 2.00 END;
  END IF;

  SELECT coalesce(SUM(cost_usd), 0) INTO v_current_spend
  FROM api_usage
  WHERE user_id = auth.uid()
    AND DATE_TRUNC('month', recorded_at) = DATE_TRUNC('month', now());

  RETURN (v_current_spend + p_estimated_cost) <= v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_usage_allowed(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_allowed(NUMERIC) TO anon;
