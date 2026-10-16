-- Every plan is limited by its credit balance only (#306).
-- enforce_tier_caps treats 0 as "no cap" for both counters.
UPDATE public.tier_config
SET max_daily_generations          = 0,
    max_indexing_minutes_per_month = 0;
