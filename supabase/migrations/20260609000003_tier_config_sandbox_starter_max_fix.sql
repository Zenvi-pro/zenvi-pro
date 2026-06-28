-- Correct sandbox Stripe price IDs (starter = $29/$300, max = $199/$1,788).
UPDATE public.tier_config
SET
  stripe_monthly_price_id_sandbox = 'price_1TB1nECJQvSDh2pb6Y9OicPv',
  stripe_annual_price_id_sandbox  = 'price_1TgGXHCJQvSDh2pbGx4tyUfv'
WHERE tier = 'starter';

UPDATE public.tier_config
SET
  stripe_monthly_price_id_sandbox = 'price_1TgGdkCJQvSDh2pbHtiJGGeM',
  stripe_annual_price_id_sandbox  = 'price_1TgGeOCJQvSDh2pbZfh5xdK3'
WHERE tier = 'max';
