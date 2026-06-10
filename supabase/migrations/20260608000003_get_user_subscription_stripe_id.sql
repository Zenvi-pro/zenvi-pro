-- Expose stripe_subscription_id so the frontend can distinguish free-tier rows from paid Stripe subs.
DROP FUNCTION IF EXISTS public.get_user_subscription();

CREATE OR REPLACE FUNCTION public.get_user_subscription()
RETURNS TABLE(
  tier                     TEXT,
  status                   TEXT,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN,
  stripe_subscription_id   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.tier,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    s.stripe_subscription_id
  FROM subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  ORDER BY s.current_period_end DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_subscription() TO authenticated;
