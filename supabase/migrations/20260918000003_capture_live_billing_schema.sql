-- ─────────────────────────────────────────────────────────────────────────────
-- Capture live billing schema (objects historically production-only)
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotent: CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE.
-- Does not drop or rewrite row data.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Tables + missing columns
-- ═════════════════════════════════════════════════════════════════════════════

-- operation_pricing — never existed in prior repo migrations
CREATE TABLE IF NOT EXISTS public.operation_pricing (
  operation_key       TEXT PRIMARY KEY,
  points_per_unit     INTEGER NOT NULL,
  unit_type           TEXT NOT NULL DEFAULT 'flat',
  category            TEXT NOT NULL DEFAULT 'other',
  provider            TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  description         TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  usd_cost_per_unit   NUMERIC(12, 6),
  margin_multiplier   NUMERIC(6, 3) DEFAULT 2.0,
  CONSTRAINT operation_pricing_points_per_unit_check CHECK (points_per_unit >= 0),
  CONSTRAINT operation_pricing_unit_type_check CHECK (
    unit_type = ANY (ARRAY['flat'::text, 'per_minute'::text, 'per_unit'::text, 'per_second'::text])
  ),
  CONSTRAINT operation_pricing_category_check CHECK (
    category = ANY (ARRAY[
      'llm'::text, 'video'::text, 'indexing'::text, 'search'::text,
      'research'::text, 'vision'::text, 'other'::text, 'system'::text
    ])
  )
);

ALTER TABLE public.operation_pricing
  ADD COLUMN IF NOT EXISTS usd_cost_per_unit NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS margin_multiplier NUMERIC(6, 3) DEFAULT 2.0;

-- Live tables created before per_second existed still have the old CHECK.
ALTER TABLE public.operation_pricing
  DROP CONSTRAINT IF EXISTS operation_pricing_unit_type_check;
ALTER TABLE public.operation_pricing
  ADD CONSTRAINT operation_pricing_unit_type_check CHECK (
    unit_type = ANY (ARRAY['flat'::text, 'per_minute'::text, 'per_unit'::text, 'per_second'::text])
  );

ALTER TABLE public.operation_pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read operation pricing"
    ON public.operation_pricing FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- api_pricing
CREATE TABLE IF NOT EXISTS public.api_pricing (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                      TEXT NOT NULL,
  model_pattern                 TEXT NOT NULL,
  input_cost_per_million        NUMERIC(10, 4) NOT NULL DEFAULT 0,
  output_cost_per_million       NUMERIC(10, 4) NOT NULL DEFAULT 0,
  flat_cost_per_unit            NUMERIC(10, 6) NOT NULL DEFAULT 0,
  effective_from                TIMESTAMPTZ NOT NULL DEFAULT now(),
  cache_read_cost_per_million   NUMERIC(12, 6) DEFAULT 0,
  cache_write_cost_per_million  NUMERIC(12, 6) DEFAULT 0,
  UNIQUE (provider, model_pattern)
);

ALTER TABLE public.api_pricing
  ADD COLUMN IF NOT EXISTS cache_read_cost_per_million NUMERIC(12, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_write_cost_per_million NUMERIC(12, 6) DEFAULT 0;

-- tier_config
CREATE TABLE IF NOT EXISTS public.tier_config (
  tier                           TEXT PRIMARY KEY,
  monthly_points                 INTEGER NOT NULL,
  annual_monthly_points          INTEGER NOT NULL,
  max_indexing_minutes_per_month INTEGER NOT NULL DEFAULT 0,
  max_concurrent_generations     INTEGER NOT NULL DEFAULT 1,
  max_daily_generations          INTEGER NOT NULL DEFAULT 30,
  max_export_resolution          TEXT NOT NULL DEFAULT '1080p',
  rollover_percentage            NUMERIC(4, 2) NOT NULL DEFAULT 0,
  rollover_cap_points            INTEGER NOT NULL DEFAULT 0,
  overage_allowed                BOOLEAN NOT NULL DEFAULT FALSE,
  overage_markup_percentage      NUMERIC(4, 2) NOT NULL DEFAULT 0,
  overage_monthly_cap_usd        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  seats                          INTEGER NOT NULL DEFAULT 1,
  max_accumulated_points         INTEGER NOT NULL DEFAULT 0,
  description                    TEXT,
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_monthly_price_id        TEXT,
  stripe_annual_price_id         TEXT,
  stripe_monthly_price_id_sandbox TEXT,
  stripe_annual_price_id_sandbox  TEXT
);

ALTER TABLE public.tier_config
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id_sandbox TEXT,
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id_sandbox TEXT;

-- user_credits
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_points  INTEGER NOT NULL DEFAULT 0,
  rollover_points      INTEGER NOT NULL DEFAULT 0,
  bonus_points         INTEGER NOT NULL DEFAULT 0,
  topup_points         INTEGER NOT NULL DEFAULT 0,
  total_points         INTEGER GENERATED ALWAYS AS (
                         rollover_points + subscription_points + bonus_points + topup_points
                       ) STORED,
  overage_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  overage_limit_usd    NUMERIC(10, 2) NOT NULL DEFAULT 0,
  overage_spent_cycle  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_interval     TEXT NOT NULL DEFAULT 'monthly',
  referral_code        TEXT UNIQUE,
  referred_by          UUID REFERENCES auth.users(id),
  in_standard_mode     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- point_transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  txn_type          TEXT NOT NULL,
  points_delta      INTEGER NOT NULL,
  bucket            TEXT NOT NULL,
  operation         TEXT,
  provider          TEXT,
  session_id        TEXT,
  balance_after     INTEGER,
  overage_usd       NUMERIC(10, 6),
  refund_of         UUID REFERENCES public.point_transactions(id),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  category          TEXT,
  idempotency_key   TEXT,
  input_tokens      INTEGER DEFAULT 0,
  output_tokens     INTEGER DEFAULT 0,
  model             TEXT,
  quantity          INTEGER DEFAULT 1,
  duration_seconds  NUMERIC,
  total_tokens      INTEGER GENERATED ALWAYS AS (
                      COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                    ) STORED
);

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;

DO $$ BEGIN
  ALTER TABLE public.point_transactions
    ADD COLUMN total_tokens INTEGER GENERATED ALWAYS AS (
      COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
    ) STORED;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS pt_user_created_idx
  ON public.point_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pt_user_type_idx
  ON public.point_transactions (user_id, txn_type);
CREATE INDEX IF NOT EXISTS pt_user_category_idx
  ON public.point_transactions (user_id, category, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS pt_user_idempotency_idx
  ON public.point_transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- api_usage
CREATE TABLE IF NOT EXISTS public.api_usage (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider           TEXT NOT NULL,
  model              TEXT,
  operation          TEXT,
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  units              INTEGER NOT NULL DEFAULT 1,
  cost_usd           NUMERIC(12, 6) NOT NULL DEFAULT 0,
  category           TEXT,
  app_version        TEXT,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage
  ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS api_usage_user_recorded_idx
  ON public.api_usage (user_id, recorded_at DESC);

-- llm_model_tiers
CREATE TABLE IF NOT EXISTS public.llm_model_tiers (
  model_pattern               TEXT PRIMARY KEY,
  tier_band                   TEXT NOT NULL,
  base_credits_per_call       INTEGER NOT NULL,
  context_threshold_tokens    INTEGER NOT NULL DEFAULT 8000,
  surcharge_credits_per_block INTEGER NOT NULL DEFAULT 0,
  surcharge_block_tokens      INTEGER NOT NULL DEFAULT 4000,
  description                 TEXT,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Helper functions (live definitions)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._resolve_tier_name(p_tier text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_tier, 'free'))
    WHEN 'creator' THEN 'starter'
    WHEN 'studio'  THEN 'max'
    WHEN 'none'     THEN 'free'
    ELSE lower(coalesce(p_tier, 'free'))
  END;
$$;

CREATE OR REPLACE FUNCTION public._billing_category_for_operation(p_operation text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE v_cat TEXT;
BEGIN
  SELECT category INTO v_cat FROM public.operation_pricing WHERE operation_key = p_operation AND active = TRUE;
  IF FOUND THEN RETURN v_cat; END IF;
  RETURN CASE
    WHEN p_operation IN ('chat', 'llm', 'assistant', 'completion') THEN 'llm'
    WHEN p_operation IN ('video_generation', 'morph_generation', 'video', 'generation') THEN 'video'
    WHEN p_operation IN ('research_query', 'research_plan', 'research') THEN 'research'
    WHEN p_operation IN ('indexing', 'index_video', 'reindex_video', 'indexing_per_minute') THEN 'indexing'
    WHEN p_operation IN ('search', 'search_query', 'clip_search') THEN 'search'
    WHEN p_operation IN ('tag_video', 'retag_video', 'vision', 'media_analysis') THEN 'vision'
    ELSE 'other' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_operation_points(
  p_operation text,
  p_units integer DEFAULT 1,
  p_duration_seconds numeric DEFAULT NULL::numeric
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.enforce_tier_caps(p_operation text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier TEXT := 'free'; v_resolved TEXT; v_cfg public.tier_config%ROWTYPE;
  v_indexing_minutes INTEGER; v_video_gens BIGINT;
BEGIN
  SELECT s.tier INTO v_tier FROM public.subscriptions s
  WHERE s.user_id = auth.uid() AND s.status IN ('active', 'trialing') LIMIT 1;
  v_resolved := public._resolve_tier_name(COALESCE(v_tier, 'free'));
  SELECT * INTO v_cfg FROM public.tier_config WHERE tier = v_resolved;
  IF NOT FOUND THEN SELECT * INTO v_cfg FROM public.tier_config WHERE tier = COALESCE(v_tier, 'free'); END IF;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_operation IN ('indexing_per_minute', 'indexing', 'index_video', 'reindex_video') THEN
    IF v_cfg.max_indexing_minutes_per_month > 0 THEN
      SELECT COALESCE(SUM(COALESCE(
        CEIL(GREATEST(0, COALESCE(pt.duration_seconds, 0)) / 60.0)::INTEGER,
        CEIL(GREATEST(0, -pt.points_delta)::NUMERIC / NULLIF(
          (SELECT points_per_unit FROM public.operation_pricing WHERE operation_key = 'indexing_per_minute'), 0
        ))::INTEGER
      )), 0)::INTEGER INTO v_indexing_minutes
      FROM public.point_transactions pt
      WHERE pt.user_id = auth.uid() AND pt.txn_type = 'deduction' AND pt.category = 'indexing'
        AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());
      IF v_indexing_minutes >= v_cfg.max_indexing_minutes_per_month THEN
        RETURN format('Monthly indexing limit reached (%s minutes on %s plan).', v_cfg.max_indexing_minutes_per_month, v_resolved);
      END IF;
    END IF;
  END IF;
  IF p_operation IN ('video_generation', 'morph_generation') THEN
    IF v_cfg.max_daily_generations > 0 THEN
      SELECT COUNT(*) INTO v_video_gens FROM public.point_transactions pt
      WHERE pt.user_id = auth.uid() AND pt.txn_type = 'deduction' AND pt.category = 'video'
        AND pt.created_at >= DATE_TRUNC('day', now());
      IF v_video_gens >= v_cfg.max_daily_generations THEN
        RETURN format('Daily video generation limit reached (%s per day on %s plan).', v_cfg.max_daily_generations, v_resolved);
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop older shorter overload so live signature is the only deduct_points
DROP FUNCTION IF EXISTS public.deduct_points(integer, text, text, text, text);

CREATE OR REPLACE FUNCTION public.deduct_points(
  p_points integer,
  p_operation text,
  p_provider text DEFAULT NULL::text,
  p_session_id text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text,
  p_category text DEFAULT NULL::text,
  p_idempotency_key text DEFAULT NULL::text,
  p_model text DEFAULT NULL::text,
  p_input_tokens integer DEFAULT 0,
  p_output_tokens integer DEFAULT 0,
  p_quantity integer DEFAULT NULL::integer,
  p_duration_seconds numeric DEFAULT NULL::numeric
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uc public.user_credits%ROWTYPE;
  v_remaining INTEGER := p_points;
  v_from_roll INTEGER := 0; v_from_sub INTEGER := 0;
  v_from_bonus INTEGER := 0; v_from_topup INTEGER := 0;
  v_total_avail INTEGER; v_category TEXT; v_balance_after INTEGER;
  v_overage_usd NUMERIC(10, 6) := 0;
BEGIN
  IF p_points <= 0 THEN RETURN 'ok'; END IF;
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = auth.uid() AND idempotency_key = p_idempotency_key AND txn_type = 'deduction'
  ) THEN RETURN 'ok'; END IF;
  v_category := COALESCE(p_category, public._billing_category_for_operation(p_operation));
  SELECT * INTO v_uc FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN 'insufficient'; END IF;
  v_total_avail := v_uc.rollover_points + v_uc.subscription_points + v_uc.bonus_points + v_uc.topup_points;
  IF v_total_avail < p_points AND NOT v_uc.overage_enabled THEN
    UPDATE public.user_credits SET in_standard_mode = TRUE WHERE user_id = auth.uid();
    RETURN 'standard_mode';
  END IF;
  IF v_remaining > 0 AND v_uc.rollover_points > 0 THEN
    v_from_roll := LEAST(v_remaining, v_uc.rollover_points); v_remaining := v_remaining - v_from_roll;
  END IF;
  IF v_remaining > 0 AND v_uc.subscription_points > 0 THEN
    v_from_sub := LEAST(v_remaining, v_uc.subscription_points); v_remaining := v_remaining - v_from_sub;
  END IF;
  IF v_remaining > 0 AND v_uc.bonus_points > 0 THEN
    v_from_bonus := LEAST(v_remaining, v_uc.bonus_points); v_remaining := v_remaining - v_from_bonus;
  END IF;
  IF v_remaining > 0 AND v_uc.topup_points > 0 THEN
    v_from_topup := LEAST(v_remaining, v_uc.topup_points); v_remaining := v_remaining - v_from_topup;
  END IF;
  -- Uncovered remainder bills as overage USD ($0.01 / credit). Cap when set.
  IF v_remaining > 0 THEN
    IF NOT v_uc.overage_enabled THEN
      UPDATE public.user_credits SET in_standard_mode = TRUE WHERE user_id = auth.uid();
      RETURN 'standard_mode';
    END IF;
    v_overage_usd := round(v_remaining * 0.01, 6);
    IF v_uc.overage_limit_usd > 0
       AND (COALESCE(v_uc.overage_spent_cycle, 0) + v_overage_usd) > v_uc.overage_limit_usd THEN
      RETURN 'overage_cap';
    END IF;
  END IF;
  UPDATE public.user_credits SET
    rollover_points = rollover_points - v_from_roll,
    subscription_points = subscription_points - v_from_sub,
    bonus_points = bonus_points - v_from_bonus,
    topup_points = topup_points - v_from_topup,
    overage_spent_cycle = overage_spent_cycle + v_overage_usd,
    in_standard_mode = (
      (rollover_points - v_from_roll) + (subscription_points - v_from_sub) +
      (bonus_points - v_from_bonus) + (topup_points - v_from_topup) = 0 AND NOT overage_enabled
    )
  WHERE user_id = auth.uid();
  v_balance_after := v_total_avail - (p_points - v_remaining);
  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket, operation, provider, session_id,
    balance_after, note, category, idempotency_key,
    model, input_tokens, output_tokens, quantity, duration_seconds, overage_usd
  ) VALUES (
    auth.uid(), 'deduction', -p_points, 'subscription',
    p_operation, p_provider, p_session_id, v_balance_after, p_note,
    v_category, p_idempotency_key, p_model,
    COALESCE(p_input_tokens, 0), COALESCE(p_output_tokens, 0),
    COALESCE(p_quantity, 1), p_duration_seconds,
    NULLIF(v_overage_usd, 0)
  );
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.charge_operation(
  p_operation text,
  p_units integer DEFAULT 1,
  p_duration_seconds numeric DEFAULT NULL::numeric,
  p_provider text DEFAULT NULL::text,
  p_session_id text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_points INTEGER; v_limit TEXT; v_provider TEXT; v_category TEXT;
BEGIN
  v_limit := public.enforce_tier_caps(p_operation);
  IF v_limit IS NOT NULL THEN RETURN 'tier_limit'; END IF;
  v_points := public.resolve_operation_points(p_operation, p_units, p_duration_seconds);
  IF v_points <= 0 THEN RETURN 'ok'; END IF;
  SELECT COALESCE(p_provider, op.provider), op.category INTO v_provider, v_category
  FROM public.operation_pricing op WHERE op.operation_key = p_operation;
  RETURN public.deduct_points(v_points, p_operation, v_provider, p_session_id, p_note, v_category, p_idempotency_key,
    NULL, 0, 0, GREATEST(1, COALESCE(p_units, 1)), p_duration_seconds);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_operation_allowed(
  p_operation text,
  p_units integer DEFAULT 1,
  p_duration_seconds numeric DEFAULT NULL::numeric
)
RETURNS TABLE(
  allowed boolean,
  balance integer,
  required integer,
  in_standard_mode boolean,
  overage_enabled boolean,
  tier text,
  block_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uc public.user_credits%ROWTYPE; v_tier TEXT := 'free'; v_required INTEGER; v_limit TEXT;
BEGIN
  INSERT INTO public.user_credits (user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_uc FROM public.user_credits WHERE user_id = auth.uid();
  SELECT s.tier INTO v_tier FROM public.subscriptions s
  WHERE s.user_id = auth.uid() AND s.status IN ('active', 'trialing') LIMIT 1;
  v_required := public.resolve_operation_points(p_operation, p_units, p_duration_seconds);
  v_limit := public.enforce_tier_caps(p_operation);
  IF v_limit IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_uc.total_points, v_required, v_uc.in_standard_mode, v_uc.overage_enabled, COALESCE(v_tier, 'free'), v_limit;
    RETURN;
  END IF;
  RETURN QUERY SELECT
    (v_uc.total_points >= v_required) OR v_uc.overage_enabled OR v_required = 0,
    v_uc.total_points, v_required, v_uc.in_standard_mode, v_uc.overage_enabled,
    COALESCE(v_tier, 'free'), NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_credits_allowed(p_estimated_credits integer DEFAULT 0)
RETURNS TABLE(
  allowed boolean,
  balance integer,
  required integer,
  in_standard_mode boolean,
  overage_enabled boolean,
  tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uc public.user_credits%ROWTYPE; v_tier TEXT := 'free';
BEGIN
  INSERT INTO public.user_credits (user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_uc FROM public.user_credits WHERE user_id = auth.uid();
  SELECT s.tier INTO v_tier FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('active', 'trialing') LIMIT 1;
  RETURN QUERY SELECT (v_uc.total_points >= p_estimated_credits) OR v_uc.overage_enabled, v_uc.total_points, p_estimated_credits, v_uc.in_standard_mode, v_uc.overage_enabled, coalesce(v_tier, 'free');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_credits_balance()
RETURNS TABLE(
  subscription_points integer,
  rollover_points integer,
  bonus_points integer,
  topup_points integer,
  total_points integer,
  overage_enabled boolean,
  overage_limit_usd numeric,
  overage_spent_cycle numeric,
  billing_interval text,
  referral_code text,
  in_standard_mode boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
  SELECT
    uc.subscription_points,
    uc.rollover_points,
    uc.bonus_points,
    uc.topup_points,
    uc.total_points,
    uc.overage_enabled,
    uc.overage_limit_usd,
    uc.overage_spent_cycle,
    uc.billing_interval,
    uc.referral_code,
    uc.in_standard_mode
  FROM public.user_credits uc
  WHERE uc.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_points(
  p_points integer,
  p_operation text,
  p_original_txn uuid DEFAULT NULL::uuid,
  p_note text DEFAULT 'Operation failed — full refund'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.user_credits
  SET subscription_points = subscription_points + p_points,
      in_standard_mode    = FALSE
  WHERE user_id = auth.uid()
  RETURNING total_points INTO v_balance;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket,
    operation, balance_after, refund_of, note
  ) VALUES (
    auth.uid(), 'refund', p_points, 'subscription',
    p_operation, v_balance, p_original_txn, p_note
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_points(
  p_user_id uuid,
  p_points integer,
  p_bucket text,
  p_txn_type text,
  p_operation text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  INSERT INTO public.user_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET
    subscription_points = subscription_points + CASE WHEN p_bucket = 'subscription' THEN p_points ELSE 0 END,
    rollover_points     = rollover_points     + CASE WHEN p_bucket = 'rollover'     THEN p_points ELSE 0 END,
    bonus_points        = bonus_points        + CASE WHEN p_bucket = 'bonus'        THEN p_points ELSE 0 END,
    topup_points        = topup_points        + CASE WHEN p_bucket = 'topup'        THEN p_points ELSE 0 END,
    in_standard_mode    = FALSE
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_balance;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket, operation, balance_after, note
  ) VALUES (
    p_user_id, p_txn_type, p_points, p_bucket, p_operation, v_balance, p_note
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_monthly_points(
  p_user_id uuid,
  p_tier text,
  p_billing_interval text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
-- 3. Grants (match live)
-- ═════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public._resolve_tier_name(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._billing_category_for_operation(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_operation_points(text, integer, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_tier_caps(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deduct_points(integer, text, text, text, text, text, text, text, integer, integer, integer, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.charge_operation(text, integer, numeric, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_operation_allowed(text, integer, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_credits_allowed(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_credits_balance() TO anon, authenticated, service_role;
-- Credit-minting / cycle allocation: service_role only (SECURITY DEFINER).
REVOKE ALL ON FUNCTION public.refund_points(integer, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_points(uuid, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.allocate_monthly_points(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_points(integer, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_points(uuid, integer, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_monthly_points(uuid, text, text) TO service_role;
