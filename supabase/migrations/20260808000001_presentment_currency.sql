-- Track the currency a customer actually transacts in.
--
-- Under Stripe Adaptive Pricing the Subscription and Invoice stay denominated in
-- the account currency (USD) while the customer is charged in their local currency.
-- The column is therefore named presentment_currency, not currency: conflating the
-- two would mislead every future reader, and the USD-denominated points economy
-- (100 points = $1 USD) continues to key off the account currency.
--
-- NULL means "not recorded" and is read as USD. Every pre-existing subscriber was
-- charged in USD, so no backfill is required.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS presentment_currency TEXT;

COMMENT ON COLUMN public.subscriptions.presentment_currency IS
  'ISO 4217 lowercase code the customer was actually charged in (Stripe presentment_details). NULL = usd. Not the subscription''s own currency, which stays the account currency.';

-- No CHECK constraint: enabling a new currency in Stripe must never make a webhook
-- write fail. The allowlist lives in supabase/functions/_shared/currency.ts.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT,
  ADD COLUMN IF NOT EXISTS billing_country    TEXT;

COMMENT ON COLUMN public.profiles.preferred_currency IS
  'Display-currency preference so an explicit choice follows the user across devices. Never authoritative for billing.';
COMMENT ON COLUMN public.profiles.billing_country IS
  'ISO 3166-1 alpha-2, captured from Stripe Checkout billing address collection.';

-- ── get_user_subscription — expose presentment_currency ──────────────────────
-- Additive to the RETURNS TABLE. zenvi-core's auth_manager reads only tier and
-- status, so the desktop contract is unaffected.
DROP FUNCTION IF EXISTS public.get_user_subscription();

CREATE OR REPLACE FUNCTION public.get_user_subscription()
RETURNS TABLE(
  tier                     TEXT,
  status                   TEXT,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN,
  stripe_subscription_id   TEXT,
  presentment_currency     TEXT
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
    s.stripe_subscription_id,
    s.presentment_currency
  FROM subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  ORDER BY s.current_period_end DESC
  LIMIT 1;
END;
$$;

-- CREATE OR REPLACE re-grants EXECUTE to PUBLIC, so revoke before granting. On
-- Supabase, revoking PUBLIC alone is not enough — anon and authenticated hold their
-- own default grants and must be named explicitly.
REVOKE EXECUTE ON FUNCTION public.get_user_subscription() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription() FROM anon;

GRANT EXECUTE ON FUNCTION public.get_user_subscription() TO authenticated;
