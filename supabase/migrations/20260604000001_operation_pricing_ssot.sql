-- ─────────────────────────────────────────────────────────────────────────────
-- Billing SSOT — operation_pricing + server-authoritative charge/check RPCs
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Phase 0 audit (Python POINTS → DB seed, $0.01/pt display convention):
--   video_generation    10 pts  | runware flat ~$0.35–0.85  | flat
--   morph_generation    10 pts  | runware morph ~$0.35      | flat
--   indexing_per_minute  8 pts  | twelvelabs $0.09/min      | per_minute (min 1)
--   research_query       2 pts  | perplexity ~$0.005–0.008  | flat
--   stock_add            3 pts  | —                         | flat
--   product_demo         5 pts  | —                         | flat
--   chat                 0 pts  | llm_model_tiers           | via charge_llm_call
--
-- Clients must use charge_operation / check_operation_allowed — not raw points.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. operation_pricing
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.operation_pricing (
  operation_key     TEXT PRIMARY KEY,
  points_per_unit   INTEGER NOT NULL CHECK (points_per_unit >= 0),
  unit_type         TEXT NOT NULL DEFAULT 'flat'
                    CHECK (unit_type IN ('flat', 'per_minute', 'per_unit')),
  category          TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN (
                      'llm', 'video', 'indexing', 'search', 'research',
                      'vision', 'other', 'system'
                    )),
  provider          TEXT,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  description       TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operation_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read operation pricing"
  ON public.operation_pricing FOR SELECT USING (TRUE);

INSERT INTO public.operation_pricing (
  operation_key, points_per_unit, unit_type, category, provider, description
) VALUES
  ('video_generation',    10, 'flat',        'video',    'runware',    'Text/image-to-video generation'),
  ('morph_generation',    10, 'flat',        'video',    'runware',    'Morph / transition generation'),
  ('indexing_per_minute',  8, 'per_minute',  'indexing', 'twelvelabs', 'TwelveLabs Marengo indexing'),
  ('research_query',       2, 'flat',        'research', 'perplexity', 'Perplexity Sonar research'),
  ('stock_add',            3, 'flat',        'other',    NULL,         'Pexels / Freesound import'),
  ('product_demo',         5, 'flat',        'other',    'remotion',   'Remotion product demo render'),
  ('chat',                 0, 'flat',        'llm',      NULL,         'LLM chat — billed via charge_llm_call')
ON CONFLICT (operation_key) DO UPDATE SET
  points_per_unit = EXCLUDED.points_per_unit,
  unit_type       = EXCLUDED.unit_type,
  category        = EXCLUDED.category,
  provider        = EXCLUDED.provider,
  description     = EXCLUDED.description,
  updated_at      = now();


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. resolve_operation_points
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.resolve_operation_points(
  p_operation         TEXT,
  p_units             INTEGER DEFAULT 1,
  p_duration_seconds  NUMERIC DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row    public.operation_pricing%ROWTYPE;
  v_units  INTEGER;
  v_minutes INTEGER;
BEGIN
  SELECT * INTO v_row
  FROM public.operation_pricing
  WHERE operation_key = p_operation AND active = TRUE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_units := GREATEST(1, COALESCE(p_units, 1));

  CASE v_row.unit_type
    WHEN 'flat' THEN
      RETURN v_row.points_per_unit;
    WHEN 'per_unit' THEN
      RETURN v_row.points_per_unit * v_units;
    WHEN 'per_minute' THEN
      v_minutes := GREATEST(
        1,
        CEIL(GREATEST(0, COALESCE(p_duration_seconds, 0)) / 60.0)::INTEGER
      );
      RETURN v_row.points_per_unit * v_minutes;
    ELSE
      RETURN v_row.points_per_unit;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_operation_points(TEXT, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_operation_points(TEXT, INTEGER, NUMERIC) TO anon;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Category helper (shared by deduct + charge)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._billing_category_for_operation(p_operation TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cat TEXT;
BEGIN
  SELECT category INTO v_cat
  FROM public.operation_pricing
  WHERE operation_key = p_operation AND active = TRUE;

  IF FOUND THEN
    RETURN v_cat;
  END IF;

  RETURN CASE
    WHEN p_operation IN ('chat', 'llm', 'assistant', 'completion')                           THEN 'llm'
    WHEN p_operation IN ('video_generation', 'morph_generation', 'video', 'generation')         THEN 'video'
    WHEN p_operation IN ('research_query', 'research_plan', 'research')                         THEN 'research'
    WHEN p_operation IN ('indexing', 'index_video', 'reindex_video', 'indexing_per_minute')       THEN 'indexing'
    WHEN p_operation IN ('search', 'search_query', 'clip_search')                                 THEN 'search'
    WHEN p_operation IN ('tag_video', 'retag_video', 'vision', 'media_analysis')                THEN 'vision'
    ELSE 'other'
  END;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. deduct_points — set category on insert; optional idempotency (Phase 5)
-- ═════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.deduct_points(INTEGER, TEXT, TEXT, TEXT, TEXT);

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS pt_user_idempotency_idx
  ON public.point_transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.deduct_points(
  p_points          INTEGER,
  p_operation       TEXT,
  p_provider        TEXT   DEFAULT NULL,
  p_session_id      TEXT   DEFAULT NULL,
  p_note            TEXT   DEFAULT NULL,
  p_category        TEXT   DEFAULT NULL,
  p_idempotency_key TEXT   DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uc          public.user_credits%ROWTYPE;
  v_remaining   INTEGER := p_points;
  v_from_roll   INTEGER := 0;
  v_from_sub    INTEGER := 0;
  v_from_bonus  INTEGER := 0;
  v_from_topup  INTEGER := 0;
  v_total_avail INTEGER;
  v_category    TEXT;
  v_balance_after INTEGER;
BEGIN
  IF p_points <= 0 THEN
    RETURN 'ok';
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = auth.uid()
      AND idempotency_key = p_idempotency_key
      AND txn_type = 'deduction'
  ) THEN
    RETURN 'ok';
  END IF;

  v_category := COALESCE(p_category, public._billing_category_for_operation(p_operation));

  SELECT * INTO v_uc
  FROM public.user_credits
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'insufficient';
  END IF;

  v_total_avail := v_uc.rollover_points + v_uc.subscription_points
                 + v_uc.bonus_points    + v_uc.topup_points;

  IF v_total_avail < p_points AND NOT v_uc.overage_enabled THEN
    UPDATE public.user_credits
    SET in_standard_mode = TRUE
    WHERE user_id = auth.uid();
    RETURN 'standard_mode';
  END IF;

  IF v_remaining > 0 AND v_uc.rollover_points > 0 THEN
    v_from_roll := LEAST(v_remaining, v_uc.rollover_points);
    v_remaining := v_remaining - v_from_roll;
  END IF;
  IF v_remaining > 0 AND v_uc.subscription_points > 0 THEN
    v_from_sub := LEAST(v_remaining, v_uc.subscription_points);
    v_remaining := v_remaining - v_from_sub;
  END IF;
  IF v_remaining > 0 AND v_uc.bonus_points > 0 THEN
    v_from_bonus := LEAST(v_remaining, v_uc.bonus_points);
    v_remaining := v_remaining - v_from_bonus;
  END IF;
  IF v_remaining > 0 AND v_uc.topup_points > 0 THEN
    v_from_topup := LEAST(v_remaining, v_uc.topup_points);
    v_remaining := v_remaining - v_from_topup;
  END IF;

  UPDATE public.user_credits
  SET
    rollover_points     = rollover_points     - v_from_roll,
    subscription_points = subscription_points - v_from_sub,
    bonus_points        = bonus_points        - v_from_bonus,
    topup_points        = topup_points        - v_from_topup,
    in_standard_mode    = (
      (rollover_points - v_from_roll) +
      (subscription_points - v_from_sub) +
      (bonus_points - v_from_bonus) +
      (topup_points - v_from_topup) = 0
      AND NOT overage_enabled
    )
  WHERE user_id = auth.uid();

  v_balance_after := v_total_avail - (p_points - v_remaining);

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket,
    operation, provider, session_id, balance_after, note,
    category, idempotency_key
  ) VALUES (
    auth.uid(), 'deduction', -p_points, 'subscription',
    p_operation, p_provider, p_session_id, v_balance_after, p_note,
    v_category, p_idempotency_key
  );

  RETURN 'ok';
END;
$$;

-- deduct_points is internal (charge_operation / charge_llm_call only) — no client grant


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. enforce_tier_limits (indexing minutes / daily video gens)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.enforce_tier_limits(p_operation TEXT)
RETURNS TEXT   -- NULL = ok, else error message
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier              TEXT := 'free';
  v_cfg               public.tier_config%ROWTYPE;
  v_indexing_minutes  INTEGER;
  v_video_gens        BIGINT;
BEGIN
  SELECT s.tier INTO v_tier
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  v_tier := COALESCE(v_tier, 'free');

  SELECT * INTO v_cfg FROM public.tier_config WHERE tier = v_tier;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_operation IN ('indexing_per_minute', 'indexing', 'index_video', 'reindex_video') THEN
    IF v_cfg.max_indexing_minutes_per_month > 0 THEN
      SELECT COALESCE(SUM(
        CEIL(GREATEST(0, -pt.points_delta)::NUMERIC / NULLIF(
          (SELECT points_per_unit FROM public.operation_pricing
           WHERE operation_key = 'indexing_per_minute'), 0
        ))
      ), 0)::INTEGER
      INTO v_indexing_minutes
      FROM public.point_transactions pt
      WHERE pt.user_id = auth.uid()
        AND pt.txn_type = 'deduction'
        AND pt.category = 'indexing'
        AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());

      IF v_indexing_minutes >= v_cfg.max_indexing_minutes_per_month THEN
        RETURN format(
          'Monthly indexing limit reached (%s minutes on %s plan).',
          v_cfg.max_indexing_minutes_per_month, v_tier
        );
      END IF;
    END IF;
  END IF;

  IF p_operation IN ('video_generation', 'morph_generation') THEN
    IF v_cfg.max_daily_generations > 0 THEN
      SELECT COUNT(*) INTO v_video_gens
      FROM public.point_transactions pt
      WHERE pt.user_id = auth.uid()
        AND pt.txn_type = 'deduction'
        AND pt.category = 'video'
        AND pt.created_at >= DATE_TRUNC('day', now());

      IF v_video_gens >= v_cfg.max_daily_generations THEN
        RETURN format(
          'Daily video generation limit reached (%s per day on %s plan).',
          v_cfg.max_daily_generations, v_tier
        );
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. charge_operation
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.charge_operation(
  p_operation         TEXT,
  p_units             INTEGER DEFAULT 1,
  p_duration_seconds  NUMERIC DEFAULT NULL,
  p_provider          TEXT DEFAULT NULL,
  p_session_id        TEXT DEFAULT NULL,
  p_note              TEXT DEFAULT NULL,
  p_idempotency_key   TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points   INTEGER;
  v_limit    TEXT;
  v_provider TEXT;
  v_category TEXT;
  v_result   TEXT;
BEGIN
  v_limit := public.enforce_tier_limits(p_operation);
  IF v_limit IS NOT NULL THEN
    RETURN 'tier_limit';
  END IF;

  v_points := public.resolve_operation_points(
    p_operation, p_units, p_duration_seconds
  );

  IF v_points <= 0 THEN
    RETURN 'ok';
  END IF;

  SELECT COALESCE(p_provider, op.provider), op.category
  INTO v_provider, v_category
  FROM public.operation_pricing op
  WHERE op.operation_key = p_operation;

  v_result := public.deduct_points(
    v_points,
    p_operation,
    v_provider,
    p_session_id,
    p_note,
    v_category,
    p_idempotency_key
  );

  IF v_result = 'ok' AND v_provider IS NOT NULL THEN
    UPDATE public.point_transactions pt
    SET cost_usd = public.calculate_api_cost(
      v_provider,
      p_operation,
      0,
      0,
      GREATEST(1, COALESCE(p_units, 1))
    )
    FROM (
      SELECT id
      FROM public.point_transactions
      WHERE user_id = auth.uid()
        AND txn_type = 'deduction'
        AND operation = p_operation
        AND (
          (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
          OR (p_idempotency_key IS NULL AND created_at >= now() - interval '2 seconds')
        )
      ORDER BY created_at DESC
      LIMIT 1
    ) latest
    WHERE pt.id = latest.id;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.charge_operation(
  TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, TEXT
) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. check_operation_allowed
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_operation_allowed(
  p_operation         TEXT,
  p_units             INTEGER DEFAULT 1,
  p_duration_seconds  NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  allowed          BOOLEAN,
  balance          INTEGER,
  required         INTEGER,
  in_standard_mode BOOLEAN,
  overage_enabled  BOOLEAN,
  tier             TEXT,
  block_reason     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uc       public.user_credits%ROWTYPE;
  v_tier     TEXT := 'free';
  v_required INTEGER;
  v_limit    TEXT;
BEGIN
  INSERT INTO public.user_credits (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_uc FROM public.user_credits WHERE user_id = auth.uid();

  SELECT s.tier INTO v_tier
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  v_required := public.resolve_operation_points(
    p_operation, p_units, p_duration_seconds
  );

  v_limit := public.enforce_tier_limits(p_operation);
  IF v_limit IS NOT NULL THEN
    RETURN QUERY SELECT
      FALSE, v_uc.total_points, v_required,
      v_uc.in_standard_mode, v_uc.overage_enabled,
      COALESCE(v_tier, 'free'), v_limit;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (v_uc.total_points >= v_required) OR v_uc.overage_enabled OR v_required = 0,
    v_uc.total_points,
    v_required,
    v_uc.in_standard_mode,
    v_uc.overage_enabled,
    COALESCE(v_tier, 'free'),
    NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_operation_allowed(TEXT, INTEGER, NUMERIC) TO authenticated;

COMMENT ON TABLE public.operation_pricing IS
  'Authoritative points pricing for non-LLM operations. LLM uses llm_model_tiers + charge_llm_call.';
