-- ── tier_config ───────────────────────────────────────────────────────────────
-- Points-based tier configuration. Completely separate from the existing
-- tier_limits table (which remains untouched). All limits are rows here —
-- changing a tier's allocation = one UPDATE, zero code deploys.
--
-- 100 points = $1 USD. Points are integers throughout.
--
-- Billing intervals: 'monthly' | 'annual'
-- When a user is on an annual plan they receive annual_monthly_points each cycle
-- instead of monthly_points.

CREATE TABLE IF NOT EXISTS public.tier_config (
  tier                          TEXT PRIMARY KEY,          -- creator | pro | studio | lifetime
  -- Points allocation
  monthly_points                INTEGER NOT NULL,          -- points granted each monthly cycle
  annual_monthly_points         INTEGER NOT NULL,          -- points granted each annual cycle (per month)
  -- Per-feature caps (protect against single-session blowouts)
  max_indexing_minutes_per_month INTEGER NOT NULL DEFAULT 0, -- TwelveLabs indexing cap (0 = no cap)
  max_concurrent_generations     INTEGER NOT NULL DEFAULT 1,
  max_daily_generations          INTEGER NOT NULL DEFAULT 30,
  -- Quality gates
  max_export_resolution          TEXT    NOT NULL DEFAULT '1080p',  -- '1080p' | '4k'
  -- Rollover
  rollover_percentage            NUMERIC(4,2) NOT NULL DEFAULT 0,   -- e.g. 0.20 = 20%
  rollover_cap_points            INTEGER NOT NULL DEFAULT 0,
  -- Overage
  overage_allowed                BOOLEAN NOT NULL DEFAULT FALSE,
  overage_markup_percentage      NUMERIC(4,2) NOT NULL DEFAULT 0,   -- e.g. 0.20 = 20% markup
  overage_monthly_cap_usd        NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Team
  seats                          INTEGER NOT NULL DEFAULT 1,
  -- Lifetime-specific
  max_accumulated_points         INTEGER NOT NULL DEFAULT 0,        -- 0 = use rollover_cap instead
  -- Metadata
  description                    TEXT,
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tier config" ON public.tier_config FOR SELECT USING (true);

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO public.tier_config (
  tier,
  monthly_points, annual_monthly_points,
  max_indexing_minutes_per_month, max_concurrent_generations, max_daily_generations,
  max_export_resolution,
  rollover_percentage, rollover_cap_points,
  overage_allowed, overage_markup_percentage, overage_monthly_cap_usd,
  seats, max_accumulated_points,
  description
) VALUES
  -- Creator: $29/mo or $249/yr
  ('creator',
   1500, 1800,
   60, 1, 30,
   '1080p',
   0.20, 300,
   true, 0.20, 20.00,
   1, 0,
   'Creator plan — solo creators, YouTubers, indie filmmakers'),

  -- Pro: $99/mo or $999/yr
  ('pro',
   5000, 6000,
   250, 2, 100,
   '4k',
   0.25, 1250,
   true, 0.10, 50.00,
   1, 0,
   'Pro plan — freelancers, marketing teams, client work'),

  -- Studio: $199/mo or Contact Sales annual
  ('studio',
   12000, 14400,
   600, 3, 300,
   '4k',
   0.30, 3600,
   true, 0.00, 100.00,
   3, 0,
   'Studio plan — agencies, production teams, 3 shared seats'),

  -- Lifetime: $99 one-time
  ('lifetime',
   1000, 1000,
   40, 1, 20,
   '1080p',
   0.50, 1500,
   false, 0.00, 0.00,
   1, 1500,
   'Lifetime access — 1,000 pts/mo forever, max 1,500 accumulated')

ON CONFLICT (tier) DO UPDATE SET
  monthly_points                 = EXCLUDED.monthly_points,
  annual_monthly_points          = EXCLUDED.annual_monthly_points,
  max_indexing_minutes_per_month = EXCLUDED.max_indexing_minutes_per_month,
  max_concurrent_generations     = EXCLUDED.max_concurrent_generations,
  max_daily_generations          = EXCLUDED.max_daily_generations,
  max_export_resolution          = EXCLUDED.max_export_resolution,
  rollover_percentage            = EXCLUDED.rollover_percentage,
  rollover_cap_points            = EXCLUDED.rollover_cap_points,
  overage_allowed                = EXCLUDED.overage_allowed,
  overage_markup_percentage      = EXCLUDED.overage_markup_percentage,
  overage_monthly_cap_usd        = EXCLUDED.overage_monthly_cap_usd,
  seats                          = EXCLUDED.seats,
  max_accumulated_points         = EXCLUDED.max_accumulated_points,
  description                    = EXCLUDED.description,
  updated_at                     = now();

-- ── get_tier_config ───────────────────────────────────────────────────────────
-- Helper used by other functions to fetch a tier's limits in one call.
CREATE OR REPLACE FUNCTION public.get_tier_config(p_tier TEXT)
RETURNS public.tier_config
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.tier_config WHERE tier = p_tier LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tier_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tier_config(TEXT) TO anon;
