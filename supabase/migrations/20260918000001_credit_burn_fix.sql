-- ─────────────────────────────────────────────────────────────────────────────
-- Credit burn fix — restore allowances, cost-plus pricing, working gen caps
-- ─────────────────────────────────────────────────────────────────────────────
-- Same-deploy: never restore monthly_points without repricing video.
-- Formula: credits = ceil(our_usd * 100 * 2.0)  →  100 credits = $1 user spend

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. tier_config — restore monthly allowances + tighten gen caps + Free 200
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.tier_config SET
  monthly_points = 200,
  annual_monthly_points = 200,
  max_daily_generations = 1,
  max_concurrent_generations = 1,
  description = 'Free trial — 200 pts/mo (1 five-second AI clip to try)',
  updated_at = now()
WHERE tier = 'free';

UPDATE public.tier_config SET
  monthly_points = 2500,
  max_daily_generations = 8,
  max_concurrent_generations = 1,
  description = 'Starter plan — $29/mo, 1 seat, ~22 five-second AI clips',
  updated_at = now()
WHERE tier = 'starter';

UPDATE public.tier_config SET
  monthly_points = 5500,
  max_daily_generations = 15,
  max_concurrent_generations = 2,
  description = 'Pro plan — $49/mo, 3 seats, ~49 five-second AI clips',
  updated_at = now()
WHERE tier = 'pro';

UPDATE public.tier_config SET
  monthly_points = 25000,
  -- Max annual was underwater at 30k ($150 COGS vs $149). Cap at 20k.
  annual_monthly_points = 20000,
  max_daily_generations = 30,
  max_concurrent_generations = 3,
  description = 'Max plan — $199/mo, 8 seats, ~223 five-second AI clips',
  updated_at = now()
WHERE tier = 'max';


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. operation_pricing — cost-plus stickers (2x margin)
-- ═════════════════════════════════════════════════════════════════════════════
-- Video: unit_type stays flat for preflight; backend computes duration-aware
-- credits from api_pricing and passes the actual points. Desktop stops charging
-- video/morph/indexing (backend-only path).
-- Indexing: 18 cr/min ($0.09 * 200). Stock: 0 (free API). Whisper handled in backend.

ALTER TABLE public.operation_pricing
  ADD COLUMN IF NOT EXISTS usd_cost_per_unit NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS margin_multiplier NUMERIC(6, 3) DEFAULT 2.0;

UPDATE public.operation_pricing SET
  points_per_unit = 112,
  usd_cost_per_unit = 0.560000,
  margin_multiplier = 2.0,
  unit_type = 'flat',
  description = 'Kling O1 Pro 5s T2V baseline ($0.56 * 2x). Backend overrides by duration/mode.',
  updated_at = now()
WHERE operation_key = 'video_generation';

UPDATE public.operation_pricing SET
  points_per_unit = 168,
  usd_cost_per_unit = 0.840000,
  margin_multiplier = 2.0,
  unit_type = 'flat',
  description = 'Kling O1 Pro 5s V2V/morph baseline ($0.84 * 2x). Backend overrides by duration.',
  updated_at = now()
WHERE operation_key = 'morph_generation';

UPDATE public.operation_pricing SET
  points_per_unit = 18,
  usd_cost_per_unit = 0.090000,
  margin_multiplier = 2.0,
  unit_type = 'per_minute',
  description = 'TwelveLabs indexing — $0.09/min * 2x = 18 cr/min. Backend-only charge.',
  updated_at = now()
WHERE operation_key = 'indexing_per_minute';

UPDATE public.operation_pricing SET
  points_per_unit = 0,
  usd_cost_per_unit = 0,
  margin_multiplier = 2.0,
  description = 'Stock import (Pexels/Freesound) — free API, 0 credits',
  updated_at = now()
WHERE operation_key = 'stock_add';

UPDATE public.operation_pricing SET
  points_per_unit = 1,
  usd_cost_per_unit = 0.005000,
  margin_multiplier = 2.0,
  description = 'Perplexity research — ~$0.005 * 2x ≈ 1 cr',
  updated_at = now()
WHERE operation_key = 'research_query';

-- Upsert new operation keys without requiring a unique constraint name
INSERT INTO public.operation_pricing (
  operation_key, points_per_unit, unit_type, category, provider, active, description,
  usd_cost_per_unit, margin_multiplier
)
SELECT * FROM (VALUES
  ('transcribe', 2, 'per_minute', 'other', 'openai', TRUE,
   'Whisper — $0.006/min * 2x ≈ 2 cr/min', 0.006000::NUMERIC, 2.0::NUMERIC),
  ('tts', 3, 'per_unit', 'other', 'openai', TRUE,
   'OpenAI TTS — ~3 cr per 1000 characters', 0.015000::NUMERIC, 2.0::NUMERIC),
  ('search_query', 1, 'flat', 'search', 'twelvelabs', TRUE,
   'Clip search — $0.002 * 2x ≈ 1 cr', 0.002000::NUMERIC, 2.0::NUMERIC),
  ('media_analysis', 1, 'flat', 'vision', 'google', TRUE,
   'Gemini vision/tag — $0.002 * 2x ≈ 1 cr', 0.002000::NUMERIC, 2.0::NUMERIC)
) AS v(operation_key, points_per_unit, unit_type, category, provider, active, description, usd_cost_per_unit, margin_multiplier)
WHERE NOT EXISTS (
  SELECT 1 FROM public.operation_pricing op WHERE op.operation_key = v.operation_key
);

UPDATE public.operation_pricing op SET
  points_per_unit = v.points_per_unit,
  unit_type = v.unit_type,
  usd_cost_per_unit = v.usd_cost_per_unit,
  margin_multiplier = v.margin_multiplier,
  description = v.description,
  updated_at = now()
FROM (VALUES
  ('transcribe', 2, 'per_minute', 0.006000::NUMERIC, 2.0::NUMERIC, 'Whisper — $0.006/min * 2x ≈ 2 cr/min'),
  ('tts', 3, 'per_unit', 0.015000::NUMERIC, 2.0::NUMERIC, 'OpenAI TTS — ~3 cr per 1000 characters'),
  ('search_query', 1, 'flat', 0.002000::NUMERIC, 2.0::NUMERIC, 'Clip search — $0.002 * 2x ≈ 1 cr'),
  ('media_analysis', 1, 'flat', 0.002000::NUMERIC, 2.0::NUMERIC, 'Gemini vision/tag — $0.002 * 2x ≈ 1 cr')
) AS v(operation_key, points_per_unit, unit_type, usd_cost_per_unit, margin_multiplier, description)
WHERE op.operation_key = v.operation_key;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. api_pricing — real Kling O1 per-second USD + margin helper
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.api_pricing
  ADD COLUMN IF NOT EXISTS cache_read_cost_per_million NUMERIC(12, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_write_cost_per_million NUMERIC(12, 6) DEFAULT 0;

-- Remove stale flat wildcard understatement for O1
DELETE FROM public.api_pricing
WHERE provider = 'runware' AND model_pattern IN (
  'kling-1.6-std%', 'kling-1.6-pro%', 'kling-2.0%', 'morph%'
);

INSERT INTO public.api_pricing (
  provider, model_pattern, input_cost_per_million, output_cost_per_million, flat_cost_per_unit
) VALUES
  -- flat_cost_per_unit = USD per SECOND for video models
  ('runware', 'klingai:kling@o1-standard%', 0, 0, 0.084000),  -- Standard T2V/I2V
  ('runware', 'klingai:kling@o1%',          0, 0, 0.112000),  -- Pro T2V/I2V
  ('runware', 'kling-o1-pro-r2v%',          0, 0, 0.168000),  -- Pro R2V/V2V
  ('runware', 'kling-o1-std-r2v%',          0, 0, 0.126000),  -- Standard R2V
  ('runware', 'morph%',                     0, 0, 0.168000),  -- morph uses V2V rate
  ('runware', '%',                          0, 0, 0.112000),  -- default = Pro T2V/s
  ('openai',  'whisper%',                   0, 0, 0.006000),  -- per minute
  ('openai',  'tts-1%',                     0, 0, 0.015000),  -- per 1k chars approx
  ('openai',  'tts-1-hd%',                  0, 0, 0.030000)
ON CONFLICT (provider, model_pattern) DO UPDATE SET
  flat_cost_per_unit = EXCLUDED.flat_cost_per_unit,
  input_cost_per_million = EXCLUDED.input_cost_per_million,
  output_cost_per_million = EXCLUDED.output_cost_per_million;

-- Anthropic cache rates (cache read = 10% of input, cache write = 25% write premium ≈ 1.25x)
UPDATE public.api_pricing SET
  cache_read_cost_per_million = input_cost_per_million * 0.10,
  cache_write_cost_per_million = input_cost_per_million * 1.25
WHERE provider = 'anthropic';

UPDATE public.api_pricing SET
  cache_read_cost_per_million = input_cost_per_million * 0.50,
  cache_write_cost_per_million = input_cost_per_million
WHERE provider = 'openai' AND input_cost_per_million > 0;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. compute_usd_credits — single formula for dollar → credits
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.compute_usd_credits(
  p_usd NUMERIC,
  p_margin NUMERIC DEFAULT 2.0
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_usd IS NULL OR p_usd <= 0 THEN RETURN 0; END IF;
  RETURN GREATEST(1, CEIL(p_usd * 100.0 * COALESCE(NULLIF(p_margin, 0), 2.0))::INTEGER);
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_usd_credits(NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_usd_credits(NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_usd_credits(NUMERIC, NUMERIC) TO anon;


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. resolve_operation_points — add per_second unit_type
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.resolve_operation_points(
  p_operation text,
  p_units integer DEFAULT 1,
  p_duration_seconds numeric DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.operation_pricing%ROWTYPE;
  v_units INTEGER;
  v_minutes INTEGER;
  v_seconds INTEGER;
BEGIN
  SELECT * INTO v_row FROM public.operation_pricing
  WHERE operation_key = p_operation AND active = TRUE;
  IF NOT FOUND THEN RETURN 0; END IF;
  v_units := GREATEST(1, COALESCE(p_units, 1));
  CASE v_row.unit_type
    WHEN 'flat' THEN RETURN v_row.points_per_unit;
    WHEN 'per_unit' THEN RETURN v_row.points_per_unit * v_units;
    WHEN 'per_minute' THEN
      v_minutes := GREATEST(1, CEIL(GREATEST(0, COALESCE(p_duration_seconds, 0)) / 60.0)::INTEGER);
      RETURN v_row.points_per_unit * v_minutes;
    WHEN 'per_second' THEN
      v_seconds := GREATEST(1, CEIL(GREATEST(0, COALESCE(p_duration_seconds, 5))::NUMERIC)::INTEGER);
      RETURN v_row.points_per_unit * v_seconds;
    ELSE RETURN v_row.points_per_unit;
  END CASE;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. enforce_tier_caps — keep; daily caps now 1/8/15/30 via tier_config update
-- ═════════════════════════════════════════════════════════════════════════════
-- (function body unchanged; reads max_daily_generations from tier_config)


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. allocate_monthly_points — stop wiping bonus_points
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.allocate_monthly_points(
  p_user_id uuid,
  p_tier text,
  p_billing_interval text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg            public.tier_config;
  v_uc             public.user_credits%ROWTYPE;
  v_new_points     INTEGER;
  v_rollover_earn  INTEGER;
  v_rollover_carry INTEGER;
BEGIN
  SELECT * INTO v_cfg FROM public.get_tier_config(p_tier);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown tier: %', p_tier;
  END IF;

  v_new_points := CASE
    WHEN p_billing_interval = 'annual'   THEN v_cfg.annual_monthly_points
    WHEN p_billing_interval = 'lifetime' THEN v_cfg.monthly_points
    ELSE v_cfg.monthly_points
  END;

  SELECT * INTO v_uc
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, billing_interval)
    VALUES (p_user_id, p_billing_interval);
    SELECT * INTO v_uc FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF v_cfg.rollover_percentage > 0 AND v_uc.subscription_points > 0 THEN
    v_rollover_earn  := floor(v_uc.subscription_points * v_cfg.rollover_percentage);
    v_rollover_carry := LEAST(v_rollover_earn, v_cfg.rollover_cap_points);
  ELSE
    v_rollover_carry := 0;
  END IF;

  IF p_billing_interval = 'lifetime' AND v_cfg.max_accumulated_points > 0 THEN
    v_rollover_carry := GREATEST(0,
      LEAST(
        v_cfg.max_accumulated_points - (v_uc.rollover_points + v_new_points + v_uc.bonus_points + v_uc.topup_points),
        v_uc.subscription_points
      )
    );
  END IF;

  -- Do NOT zero bonus_points — earned bonuses persist across renewals
  UPDATE public.user_credits
  SET
    subscription_points = v_new_points,
    rollover_points     = v_uc.rollover_points + v_rollover_carry,
    overage_spent_cycle = 0,
    billing_interval    = p_billing_interval,
    in_standard_mode    = FALSE
  WHERE user_id = p_user_id;

  IF v_rollover_carry > 0 THEN
    INSERT INTO public.point_transactions (
      user_id, txn_type, points_delta, bucket, operation, note
    ) VALUES (
      p_user_id, 'rollover', v_rollover_carry, 'rollover',
      'cycle_renewal',
      format('%s pts rolled over (%s%% of %s remaining)',
        v_rollover_carry,
        (v_cfg.rollover_percentage * 100)::INT,
        v_uc.subscription_points)
    );
  END IF;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket, operation, note
  ) VALUES (
    p_user_id, 'allocation', v_new_points, 'subscription',
    'cycle_renewal',
    format('%s plan (%s) — %s pts allocated', p_tier, p_billing_interval, v_new_points)
  );
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 8. allocate_free_tier_for_user — SET to free allotment, do not accumulate
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.allocate_free_tier_for_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_pts INTEGER;
  v_has_paid BOOLEAN;
  v_already  INTEGER;
  v_current  INTEGER;
BEGIN
  SELECT monthly_points INTO v_free_pts FROM public.tier_config WHERE tier = 'free';
  IF v_free_pts IS NULL OR v_free_pts <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Skip anyone with an active/trialing paid subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing')
      AND s.tier IS DISTINCT FROM 'free'
  ) INTO v_has_paid;
  IF v_has_paid THEN
    RETURN FALSE;
  END IF;

  -- Idempotent per calendar month
  SELECT COUNT(*) INTO v_already
  FROM public.point_transactions pt
  WHERE pt.user_id = p_user_id
    AND pt.txn_type = 'allocation'
    AND pt.operation = 'free_tier_monthly'
    AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());
  IF v_already > 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- SET subscription_points to free allotment (do not add/stack)
  SELECT subscription_points INTO v_current
  FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;

  UPDATE public.user_credits
  SET subscription_points = v_free_pts,
      in_standard_mode = FALSE
  WHERE user_id = p_user_id;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket, operation, note, balance_after
  ) VALUES (
    p_user_id, 'allocation', v_free_pts, 'subscription',
    'free_tier_monthly',
    format('Free tier monthly set to %s pts (was %s)', v_free_pts, COALESCE(v_current, 0)),
    (SELECT total_points FROM public.user_credits WHERE user_id = p_user_id)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_free_tier_for_user(uuid) TO service_role;


-- ═════════════════════════════════════════════════════════════════════════════
-- 9. Retroactive credit for monthly paid subscribers hit by the 10x bug
-- ═════════════════════════════════════════════════════════════════════════════
-- Shortfall = restored monthly allotment minus what the LAST renewal actually
-- allocated. Never derived from the current balance: that is already net of
-- spending and would hand back credits the user has used. Users with no renewal
-- record are skipped (we cannot tell what they were given), and a user is only
-- ever credited once.
DO $$
DECLARE
  r RECORD;
  v_allocated INTEGER;
  v_shortfall INTEGER;
BEGIN
  FOR r IN
    SELECT s.user_id, s.tier, tc.monthly_points AS target
    FROM public.subscriptions s
    JOIN public.user_credits uc ON uc.user_id = s.user_id
    JOIN public.tier_config tc ON tc.tier = s.tier
    WHERE s.status IN ('active', 'trialing')
      AND s.tier IN ('starter', 'pro', 'max')
      AND COALESCE(s.billing_interval, 'monthly') = 'monthly'
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.point_transactions pt
      WHERE pt.user_id = r.user_id AND pt.operation = 'retroactive_10x_fix'
    ) THEN
      CONTINUE;
    END IF;

    SELECT pt.points_delta INTO v_allocated
    FROM public.point_transactions pt
    WHERE pt.user_id = r.user_id
      AND pt.txn_type = 'allocation'
      AND pt.bucket = 'subscription'
      AND pt.operation = 'cycle_renewal'
    ORDER BY pt.created_at DESC
    LIMIT 1;
    IF v_allocated IS NULL THEN
      CONTINUE;
    END IF;

    v_shortfall := GREATEST(0, r.target - v_allocated);
    IF v_shortfall > 0 THEN
      PERFORM public.credit_points(
        r.user_id,
        v_shortfall,
        'subscription',
        'allocation',
        'retroactive_10x_fix',
        format('Retroactive credit: %s plan renewal gave %s of %s monthly pts', r.tier, v_allocated, r.target)
      );
    END IF;
  END LOOP;
END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 10. Restore api_usage analytics table (was dropped / never in live DB)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.api_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  model         TEXT,
  operation     TEXT,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  units         INTEGER NOT NULL DEFAULT 1,
  cost_usd      NUMERIC(12, 6) NOT NULL DEFAULT 0,
  category      TEXT,
  app_version   TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own api_usage"
    ON public.api_usage FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS api_usage_user_recorded_idx
  ON public.api_usage (user_id, recorded_at DESC);


CREATE OR REPLACE FUNCTION public.calculate_api_cost(
  p_provider TEXT,
  p_model TEXT,
  p_input_tokens INT,
  p_output_tokens INT,
  p_units INT DEFAULT 1,
  p_cache_read_tokens INT DEFAULT 0,
  p_cache_write_tokens INT DEFAULT 0
)
RETURNS NUMERIC(12, 6)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_row public.api_pricing%ROWTYPE;
  v_cost NUMERIC(12, 6) := 0;
BEGIN
  SELECT * INTO v_row
  FROM public.api_pricing
  WHERE provider = p_provider
    AND lower(coalesce(p_model, '')) LIKE lower(model_pattern)
  ORDER BY length(model_pattern) DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_row.flat_cost_per_unit > 0 AND coalesce(p_input_tokens, 0) = 0 AND coalesce(p_output_tokens, 0) = 0 THEN
    RETURN v_row.flat_cost_per_unit * GREATEST(1, coalesce(p_units, 1));
  END IF;

  v_cost := (coalesce(p_input_tokens, 0)  * v_row.input_cost_per_million  / 1000000.0)
          + (coalesce(p_output_tokens, 0) * v_row.output_cost_per_million / 1000000.0)
          + (coalesce(p_cache_read_tokens, 0)  * coalesce(v_row.cache_read_cost_per_million, 0)  / 1000000.0)
          + (coalesce(p_cache_write_tokens, 0) * coalesce(v_row.cache_write_cost_per_million, 0) / 1000000.0);
  RETURN v_cost;
END;
$$;


CREATE OR REPLACE FUNCTION public.batch_record_api_usage(records JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec JSONB;
  v_cost NUMERIC(12, 6);
  v_count INT := 0;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(records)
  LOOP
    v_cost := public.calculate_api_cost(
      rec->>'provider',
      coalesce(rec->>'model', ''),
      coalesce((rec->>'input_tokens')::INT, 0),
      coalesce((rec->>'output_tokens')::INT, 0),
      coalesce((rec->>'units')::INT, 1),
      coalesce((rec->>'cache_read_tokens')::INT, 0),
      coalesce((rec->>'cache_write_tokens')::INT, 0)
    );
    INSERT INTO public.api_usage (
      user_id, provider, model, operation,
      input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
      units, cost_usd, category, app_version, recorded_at
    ) VALUES (
      auth.uid(),
      rec->>'provider',
      coalesce(rec->>'model', ''),
      coalesce(rec->>'operation', 'unknown'),
      coalesce((rec->>'input_tokens')::INT, 0),
      coalesce((rec->>'output_tokens')::INT, 0),
      coalesce((rec->>'cache_read_tokens')::INT, 0),
      coalesce((rec->>'cache_write_tokens')::INT, 0),
      coalesce((rec->>'units')::INT, 1),
      v_cost,
      coalesce(rec->>'category', public._billing_category_for_operation(coalesce(rec->>'operation', ''))),
      coalesce(rec->>'app_version', ''),
      coalesce((rec->>'recorded_at')::TIMESTAMPTZ, now())
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.batch_record_api_usage(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_record_api_usage(JSONB) TO service_role;


-- ═════════════════════════════════════════════════════════════════════════════
-- 11. compute_llm_credits — dollar-based with cache token support
-- ═════════════════════════════════════════════════════════════════════════════
-- DROP first: CREATE OR REPLACE cannot change default-arg signature in place.
DROP FUNCTION IF EXISTS public.compute_llm_credits(TEXT, INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.compute_llm_credits(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.compute_llm_credits(
  p_model TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_cache_read_tokens INTEGER,
  p_cache_write_tokens INTEGER
)
RETURNS TABLE(
  credits     INTEGER,
  tier_band   TEXT,
  base        INTEGER,
  surcharge   INTEGER,
  over_tokens INTEGER,
  usd_cost    NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row       public.llm_model_tiers%ROWTYPE;
  v_provider  TEXT;
  v_usd       NUMERIC(12, 6);
  v_credits   INTEGER;
BEGIN
  -- Local models free
  SELECT * INTO v_row
  FROM public.llm_model_tiers
  WHERE lower(coalesce(p_model, '')) LIKE lower(model_pattern)
  ORDER BY length(model_pattern) DESC
  LIMIT 1;

  IF FOUND AND v_row.tier_band = 'local' THEN
    RETURN QUERY SELECT 0, v_row.tier_band, 0, 0, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Infer provider from model name
  v_provider := CASE
    WHEN lower(coalesce(p_model,'')) LIKE '%claude%' OR lower(coalesce(p_model,'')) LIKE '%anthropic%' THEN 'anthropic'
    WHEN lower(coalesce(p_model,'')) LIKE '%gpt%' OR lower(coalesce(p_model,'')) LIKE '%o1%'
      OR lower(coalesce(p_model,'')) LIKE '%o3%' OR lower(coalesce(p_model,'')) LIKE '%openai%' THEN 'openai'
    WHEN lower(coalesce(p_model,'')) LIKE '%gemini%' OR lower(coalesce(p_model,'')) LIKE '%google%' THEN 'google'
    ELSE 'openai'
  END;

  v_usd := public.calculate_api_cost(
    v_provider, coalesce(p_model, ''),
    coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0),
    1, coalesce(p_cache_read_tokens, 0), coalesce(p_cache_write_tokens, 0)
  );

  -- Fallback hybrid band if USD came back 0 (unknown model)
  IF v_usd <= 0 THEN
    IF NOT FOUND THEN
      v_row.tier_band := 'light';
      v_row.base_credits_per_call := 1;
      v_row.context_threshold_tokens := 8000;
      v_row.surcharge_credits_per_block := 1;
      v_row.surcharge_block_tokens := 8000;
    END IF;
    -- Inline hybrid fallback (no nested DECLARE)
    RETURN QUERY SELECT
      (v_row.base_credits_per_call
        + CASE WHEN v_row.surcharge_block_tokens > 0
               AND GREATEST(0, coalesce(p_input_tokens,0) + coalesce(p_output_tokens,0)
                              + coalesce(p_cache_read_tokens,0) + coalesce(p_cache_write_tokens,0)
                              - v_row.context_threshold_tokens) > 0
          THEN ceil(GREATEST(0, coalesce(p_input_tokens,0) + coalesce(p_output_tokens,0)
                               + coalesce(p_cache_read_tokens,0) + coalesce(p_cache_write_tokens,0)
                               - v_row.context_threshold_tokens)::NUMERIC
                    / v_row.surcharge_block_tokens)::INTEGER
               * v_row.surcharge_credits_per_block
          ELSE 0 END),
      v_row.tier_band,
      v_row.base_credits_per_call,
      0,
      GREATEST(0, coalesce(p_input_tokens,0) + coalesce(p_output_tokens,0)
                + coalesce(p_cache_read_tokens,0) + coalesce(p_cache_write_tokens,0)
                - v_row.context_threshold_tokens),
      0::NUMERIC;
    RETURN;
  END IF;

  v_credits := public.compute_usd_credits(v_usd, 2.0);
  RETURN QUERY SELECT
    v_credits,
    coalesce(v_row.tier_band, 'standard'),
    v_credits,
    0,
    0,
    v_usd;
END;
$$;

-- Keep old 3-arg signature working for existing callers
CREATE OR REPLACE FUNCTION public.compute_llm_credits(
  p_model TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER
)
RETURNS TABLE(
  credits     INTEGER,
  tier_band   TEXT,
  base        INTEGER,
  surcharge   INTEGER,
  over_tokens INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.credits, c.tier_band, c.base, c.surcharge, c.over_tokens
  FROM public.compute_llm_credits(p_model, p_input_tokens, p_output_tokens, 0, 0) c;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_llm_credits(TEXT, INTEGER, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.compute_llm_credits(TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated, anon, service_role;


COMMENT ON FUNCTION public.compute_usd_credits IS 'credits = ceil(usd * 100 * margin). Default margin 2.0.';
COMMENT ON FUNCTION public.allocate_free_tier_for_user IS 'Sets free-tier subscription_points to the free allotment (no stacking).';
