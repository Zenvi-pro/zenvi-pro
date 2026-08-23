-- The sandbox (test-mode) Stripe price IDs seeded by 20260609000002/3 were created
-- under a different Stripe account than the one zenvi.pro actually uses
-- (acct_1TAJMBFwJmSMjJoS). Verified live via `stripe get /v1/prices/<id>` against
-- that account: all four returned "No such price" (resource_missing). Sandbox
-- checkout for starter and max has been silently broken since those migrations —
-- `create-checkout-session` would fail at `stripe.prices.retrieve()` rather than
-- with the friendlier "No Stripe price configured" (that message is only for a
-- NULL column, not a dangling ID).
--
-- `pro` never had sandbox IDs seeded at all, so it hit the friendlier NULL case.
--
-- Replaced with prices created directly under acct_1TAJMBFwJmSMjJoS in test mode
-- (products: Zenvi Starter/Pro/Max Tier), amounts matching the live USD prices
-- ($29/$300, $49/$468, $199/$1,788).

UPDATE public.tier_config
SET
  stripe_monthly_price_id_sandbox = 'price_1U7gFmFwJmSMjJoS3Oy6ykNP',
  stripe_annual_price_id_sandbox  = 'price_1U7gFnFwJmSMjJoSSYCWPyZr'
WHERE tier = 'starter';

UPDATE public.tier_config
SET
  stripe_monthly_price_id_sandbox = 'price_1U7gFnFwJmSMjJoSFkEeoHGL',
  stripe_annual_price_id_sandbox  = 'price_1U7gFoFwJmSMjJoSWzpBLjJ2'
WHERE tier = 'pro';

UPDATE public.tier_config
SET
  stripe_monthly_price_id_sandbox = 'price_1U7gFpFwJmSMjJoScCGS9aC7',
  stripe_annual_price_id_sandbox  = 'price_1U7gFqFwJmSMjJoSILpbPfFk'
WHERE tier = 'max';
