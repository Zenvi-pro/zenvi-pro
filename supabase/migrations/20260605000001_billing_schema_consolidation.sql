-- ─────────────────────────────────────────────────────────────────────────────
-- Billing schema consolidation — unified ledger, drop legacy USD tables
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SSOT:
--   User points:  operation_pricing + llm_model_tiers
--   Provider COGS: api_pricing (computed at admin read time, not stored on ledger)
--   Balance:      user_credits
--   Ledger:       point_transactions (sole usage meter)

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Ledger columns — quantity, duration, total_tokens
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS quantity         INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;

-- Backfill quantity from legacy units column before drop
UPDATE public.point_transactions
SET quantity = COALESCE(units, 1)
WHERE quantity IS NULL OR quantity = 1 AND units IS NOT NULL AND units <> 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'point_transactions'
      AND column_name = 'total_tokens'
  ) THEN
    ALTER TABLE public.point_transactions
      ADD COLUMN total_tokens INTEGER
      GENERATED ALWAYS AS (
        COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
      ) STORED;
  END IF;
END $$;

COMMENT ON COLUMN public.point_transactions.quantity IS
  'Billable item count (e.g. video generations). Default 1 for flat/LLM ops.';
COMMENT ON COLUMN public.point_transactions.duration_seconds IS
  'Billable duration for per-minute ops (e.g. TwelveLabs indexing).';
COMMENT ON TABLE public.api_pricing IS
  'SSOT for provider USD COGS rates. Admin margin computed at read time via calculate_api_cost().';
COMMENT ON TABLE public.operation_pricing IS
  'SSOT for user-facing points on non-LLM operations.';
COMMENT ON TABLE public.llm_model_tiers IS
  'SSOT for user-facing LLM credit formula (compute_llm_credits).';

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Tier name resolver (legacy creator/studio aliases)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._resolve_tier_name(p_tier TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_tier, 'free'))
    WHEN 'creator' THEN 'starter'
    WHEN 'studio'  THEN 'max'
    WHEN 'none'     THEN 'free'
    ELSE lower(p_tier)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_tier_config(p_tier TEXT)
RETURNS public.tier_config
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolved TEXT := public._resolve_tier_name(p_tier);
  v_row      public.tier_config%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.tier_config WHERE tier = v_resolved LIMIT 1;
  IF FOUND THEN
    RETURN v_row;
  END IF;
  SELECT * INTO v_row FROM public.tier_config WHERE tier = p_tier LIMIT 1;
  RETURN v_row;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. deduct_points — metering on insert (no post-update patch)
-- ═════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.deduct_points(INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.deduct_points(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.deduct_points(
  p_points            INTEGER,
  p_operation         TEXT,
  p_provider          TEXT   DEFAULT NULL,
  p_session_id        TEXT   DEFAULT NULL,
  p_note              TEXT   DEFAULT NULL,
  p_category          TEXT   DEFAULT NULL,
  p_idempotency_key   TEXT   DEFAULT NULL,
  p_model             TEXT   DEFAULT NULL,
  p_input_tokens      INTEGER DEFAULT 0,
  p_output_tokens     INTEGER DEFAULT 0,
  p_quantity          INTEGER DEFAULT NULL,
  p_duration_seconds  NUMERIC DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uc            public.user_credits%ROWTYPE;
  v_remaining     INTEGER := p_points;
  v_from_roll     INTEGER := 0;
  v_from_sub      INTEGER := 0;
  v_from_bonus    INTEGER := 0;
  v_from_topup    INTEGER := 0;
  v_total_avail   INTEGER;
  v_category      TEXT;
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
    category, idempotency_key,
    model, input_tokens, output_tokens, quantity, duration_seconds
  ) VALUES (
    auth.uid(), 'deduction', -p_points, 'subscription',
    p_operation, p_provider, p_session_id, v_balance_after, p_note,
    v_category, p_idempotency_key,
    p_model,
    COALESCE(p_input_tokens, 0),
    COALESCE(p_output_tokens, 0),
    COALESCE(p_quantity, 1),
    p_duration_seconds
  );

  RETURN 'ok';
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. enforce_tier_caps (renamed from enforce_tier_limits; reads tier_config)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.enforce_tier_caps(p_operation TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier              TEXT := 'free';
  v_resolved          TEXT;
  v_cfg               public.tier_config%ROWTYPE;
  v_indexing_minutes  INTEGER;
  v_video_gens        BIGINT;
BEGIN
  SELECT s.tier INTO v_tier
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  v_resolved := public._resolve_tier_name(COALESCE(v_tier, 'free'));

  SELECT * INTO v_cfg FROM public.tier_config WHERE tier = v_resolved;
  IF NOT FOUND THEN
    SELECT * INTO v_cfg FROM public.tier_config WHERE tier = COALESCE(v_tier, 'free');
  END IF;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_operation IN ('indexing_per_minute', 'indexing', 'index_video', 'reindex_video') THEN
    IF v_cfg.max_indexing_minutes_per_month > 0 THEN
      SELECT COALESCE(SUM(
        COALESCE(
          CEIL(GREATEST(0, COALESCE(pt.duration_seconds, 0)) / 60.0)::INTEGER,
          CEIL(GREATEST(0, -pt.points_delta)::NUMERIC / NULLIF(
            (SELECT points_per_unit FROM public.operation_pricing
             WHERE operation_key = 'indexing_per_minute'), 0
          ))::INTEGER
        )
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
          v_cfg.max_indexing_minutes_per_month, v_resolved
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
          v_cfg.max_daily_generations, v_resolved
        );
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- Backward-compat alias
CREATE OR REPLACE FUNCTION public.enforce_tier_limits(p_operation TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.enforce_tier_caps(p_operation);
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. charge_operation + charge_llm_call (metering via deduct_points)
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
BEGIN
  v_limit := public.enforce_tier_caps(p_operation);
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

  RETURN public.deduct_points(
    v_points,
    p_operation,
    v_provider,
    p_session_id,
    p_note,
    v_category,
    p_idempotency_key,
    NULL,
    0,
    0,
    GREATEST(1, COALESCE(p_units, 1)),
    p_duration_seconds
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.charge_llm_call(
  p_model           TEXT,
  p_input_tokens    INTEGER DEFAULT 0,
  p_output_tokens   INTEGER DEFAULT 0,
  p_provider        TEXT DEFAULT NULL,
  p_note            TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits   INTEGER;
  v_provider  TEXT;
  v_category  TEXT := 'llm';
BEGIN
  SELECT c.credits INTO v_credits
  FROM public.compute_llm_credits(p_model, p_input_tokens, p_output_tokens) c
  LIMIT 1;

  IF COALESCE(v_credits, 0) <= 0 THEN
    RETURN 'ok';
  END IF;

  v_provider := COALESCE(
    p_provider,
    CASE
      WHEN lower(coalesce(p_model, '')) LIKE '%gpt%' OR lower(p_model) LIKE '%openai%' THEN 'openai'
      WHEN lower(coalesce(p_model, '')) LIKE '%claude%' THEN 'anthropic'
      WHEN lower(coalesce(p_model, '')) LIKE '%gemini%' THEN 'google'
      WHEN lower(coalesce(p_model, '')) LIKE '%ollama%' OR lower(p_model) LIKE '%local%' THEN 'ollama'
      ELSE 'unknown'
    END
  );

  RETURN public.deduct_points(
    v_credits,
    'chat',
    v_provider,
    NULL,
    p_note,
    v_category,
    p_idempotency_key,
    p_model,
    COALESCE(p_input_tokens, 0),
    COALESCE(p_output_tokens, 0),
    1,
    NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.charge_operation(
  TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.charge_llm_call(
  TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT
) TO authenticated;

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

  v_limit := public.enforce_tier_caps(p_operation);
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

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. Dashboard RPCs — read point_transactions (credits, not stored USD)
-- ═════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.get_monthly_totals();
DROP FUNCTION IF EXISTS public.get_usage_summary();
DROP FUNCTION IF EXISTS public.get_usage_history(INT);

CREATE OR REPLACE FUNCTION public.get_monthly_totals()
RETURNS TABLE(
  total_credits_used    BIGINT,
  total_requests        BIGINT,
  monthly_points_limit  INTEGER,
  percentage_used       NUMERIC(5, 2),
  tier                  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier       TEXT := 'free';
  v_resolved   TEXT;
  v_limit      INTEGER := 100;
  v_used       BIGINT := 0;
  v_reqs       BIGINT := 0;
BEGIN
  SELECT s.tier INTO v_tier
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  v_resolved := public._resolve_tier_name(COALESCE(v_tier, 'free'));

  SELECT tc.monthly_points INTO v_limit
  FROM public.tier_config tc
  WHERE tc.tier = v_resolved;

  IF v_limit IS NULL THEN
    SELECT tc.monthly_points INTO v_limit
    FROM public.tier_config tc
    WHERE tc.tier = COALESCE(v_tier, 'free');
  END IF;

  v_limit := COALESCE(v_limit, 100);

  SELECT
    COALESCE(SUM(-pt.points_delta), 0)::BIGINT,
    COUNT(*)::BIGINT
  INTO v_used, v_reqs
  FROM public.point_transactions pt
  WHERE pt.user_id = auth.uid()
    AND pt.txn_type = 'deduction'
    AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());

  RETURN QUERY SELECT
    v_used,
    v_reqs,
    v_limit,
    LEAST(
      CASE WHEN v_limit > 0
        THEN (v_used::NUMERIC / v_limit * 100)::NUMERIC(5, 2)
        ELSE 0
      END,
      100.00
    ),
    COALESCE(v_tier, 'free');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usage_summary()
RETURNS TABLE(
  provider              TEXT,
  total_credits         BIGINT,
  total_input_tokens    BIGINT,
  total_output_tokens   BIGINT,
  request_count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pt.provider, 'unknown'),
    COALESCE(SUM(-pt.points_delta), 0)::BIGINT,
    COALESCE(SUM(pt.input_tokens), 0)::BIGINT,
    COALESCE(SUM(pt.output_tokens), 0)::BIGINT,
    COUNT(*)::BIGINT
  FROM public.point_transactions pt
  WHERE pt.user_id = auth.uid()
    AND pt.txn_type = 'deduction'
    AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now())
  GROUP BY COALESCE(pt.provider, 'unknown')
  ORDER BY SUM(-pt.points_delta) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usage_history(months_back INT DEFAULT 6)
RETURNS TABLE(
  month           TEXT,
  total_credits   BIGINT,
  request_count   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', pt.created_at), 'Mon ''YY') AS month,
    COALESCE(SUM(-pt.points_delta), 0)::BIGINT             AS total_credits,
    COUNT(*)::BIGINT                                         AS request_count
  FROM public.point_transactions pt
  WHERE pt.user_id = auth.uid()
    AND pt.txn_type = 'deduction'
    AND pt.created_at >= DATE_TRUNC('month', now())
                       - ((months_back - 1) || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', pt.created_at)
  ORDER BY DATE_TRUNC('month', pt.created_at) ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_history(INT) TO authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. Admin RPCs — COGS computed at read time from api_pricing
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._pt_cogs_usd(
  p_provider      TEXT,
  p_model         TEXT,
  p_operation     TEXT,
  p_input_tokens  INTEGER,
  p_output_tokens INTEGER,
  p_quantity      INTEGER
)
RETURNS NUMERIC(10, 6)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.calculate_api_cost(
    COALESCE(p_provider, 'unknown'),
    COALESCE(NULLIF(p_model, ''), COALESCE(p_operation, '')),
    COALESCE(p_input_tokens, 0),
    COALESCE(p_output_tokens, 0),
    GREATEST(1, COALESCE(p_quantity, 1))
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_summary()
RETURNS TABLE(
  total_paid_users      BIGINT,
  free_users            BIGINT,
  starter_count         BIGINT,
  pro_count             BIGINT,
  max_count             BIGINT,
  lifetime_count        BIGINT,
  legacy_count          BIGINT,
  est_mrr_usd           NUMERIC(12, 2),
  est_arr_usd           NUMERIC(12, 2),
  month_total_cost_usd  NUMERIC(12, 2),
  month_credits_used    BIGINT,
  month_request_count   BIGINT,
  est_gross_profit_usd  NUMERIC(12, 2),
  est_gross_margin_pct  NUMERIC(5, 2),
  anomalies_this_week   BIGINT,
  standard_mode_users   BIGINT,
  overage_enabled_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_starter   BIGINT;
  v_pro       BIGINT;
  v_max       BIGINT;
  v_lifetime  BIGINT;
  v_legacy    BIGINT;
  v_free      BIGINT;
  v_mrr       NUMERIC(12, 2) := 0;
  v_cost      NUMERIC(12, 2);
  v_credits   BIGINT;
  v_reqs      BIGINT;
  v_anomalies BIGINT;
  v_std       BIGINT;
  v_ovr       BIGINT;
BEGIN
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE tier = 'starter'),
    COUNT(*) FILTER (WHERE tier = 'pro'),
    COUNT(*) FILTER (WHERE tier = 'max'),
    COUNT(*) FILTER (WHERE tier = 'lifetime'),
    COUNT(*) FILTER (WHERE tier IN ('creator', 'studio'))
  INTO v_starter, v_pro, v_max, v_lifetime, v_legacy
  FROM public.subscriptions
  WHERE status IN ('active', 'trialing');

  SELECT COUNT(*) INTO v_free
  FROM auth.users u
  LEFT JOIN public.subscriptions s
    ON s.user_id = u.id AND s.status IN ('active', 'trialing')
  WHERE s.user_id IS NULL;

  v_mrr :=  v_starter * 29.00
        +   v_pro     * 49.00
        +   v_max     * 199.00
        +   v_legacy  * 29.00;

  SELECT
    COALESCE(SUM(public._pt_cogs_usd(
      pt.provider, pt.model, pt.operation,
      pt.input_tokens, pt.output_tokens, pt.quantity
    )), 0)::NUMERIC(12, 2),
    COALESCE(SUM(-pt.points_delta), 0)::BIGINT,
    COUNT(*)::BIGINT
  INTO v_cost, v_credits, v_reqs
  FROM public.point_transactions pt
  WHERE pt.txn_type = 'deduction'
    AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());

  SELECT COUNT(*) INTO v_anomalies
  FROM public.usage_anomalies
  WHERE detected_at >= now() - interval '7 days';

  SELECT
    COUNT(*) FILTER (WHERE in_standard_mode = TRUE),
    COUNT(*) FILTER (WHERE overage_enabled = TRUE)
  INTO v_std, v_ovr
  FROM public.user_credits;

  RETURN QUERY SELECT
    (v_starter + v_pro + v_max + v_lifetime + v_legacy)::BIGINT,
    v_free,
    v_starter, v_pro, v_max, v_lifetime, v_legacy,
    v_mrr,
    v_mrr * 12,
    v_cost,
    v_credits,
    v_reqs,
    (v_mrr - v_cost)::NUMERIC(12, 2),
    CASE WHEN v_mrr > 0
      THEN ((v_mrr - v_cost) / v_mrr * 100)::NUMERIC(5, 2)
      ELSE 0
    END,
    v_anomalies,
    v_std,
    v_ovr;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_top_spenders(p_limit INT DEFAULT 25)
RETURNS TABLE(
  user_id           UUID,
  email             TEXT,
  tier              TEXT,
  credits_used      BIGINT,
  cost_usd          NUMERIC(12, 4),
  request_count     BIGINT,
  in_standard_mode  BOOLEAN,
  overage_enabled   BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ptx AS (
    SELECT
      pt.user_id AS uid,
      SUM(-pt.points_delta)::BIGINT AS credits_used,
      SUM(public._pt_cogs_usd(
        pt.provider, pt.model, pt.operation,
        pt.input_tokens, pt.output_tokens, pt.quantity
      ))::NUMERIC(12, 4) AS cost_usd,
      COUNT(*)::BIGINT AS request_count
    FROM public.point_transactions pt
    WHERE pt.txn_type = 'deduction'
      AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now())
    GROUP BY pt.user_id
  )
  SELECT
    p.id,
    p.email,
    COALESCE(s.tier, 'free'),
    COALESCE(ptx.credits_used, 0),
    COALESCE(ptx.cost_usd, 0),
    COALESCE(ptx.request_count, 0),
    COALESCE(uc.in_standard_mode, FALSE),
    COALESCE(uc.overage_enabled, FALSE)
  FROM public.profiles p
  LEFT JOIN public.subscriptions s
    ON s.user_id = p.id AND s.status IN ('active', 'trialing')
  LEFT JOIN public.user_credits uc ON uc.user_id = p.id
  LEFT JOIN ptx ON ptx.uid = p.id
  WHERE COALESCE(ptx.credits_used, 0) > 0
  ORDER BY credits_used DESC
  LIMIT p_limit;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. Backfill historical api_usage → point_transactions (analytics only)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.point_transactions (
  user_id, txn_type, points_delta, bucket,
  operation, provider, model,
  input_tokens, output_tokens, quantity, category,
  note, created_at
)
SELECT
  au.user_id,
  'deduction',
  0,
  'subscription',
  COALESCE(au.operation, 'unknown'),
  au.provider,
  au.model,
  COALESCE(au.input_tokens, 0),
  COALESCE(au.output_tokens, 0),
  COALESCE(au.units, 1),
  COALESCE(au.category, 'other'),
  'Imported from api_usage (historical analytics)',
  au.recorded_at
FROM public.api_usage au
WHERE NOT EXISTS (
  SELECT 1
  FROM public.point_transactions pt
  WHERE pt.user_id = au.user_id
    AND pt.created_at = au.recorded_at
    AND COALESCE(pt.provider, '') = au.provider
    AND COALESCE(pt.operation, '') = COALESCE(au.operation, '')
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 9. Drop legacy columns, functions, tables
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.point_transactions
  DROP COLUMN IF EXISTS cost_usd,
  DROP COLUMN IF EXISTS units;

DROP FUNCTION IF EXISTS public.batch_record_api_usage(JSONB);
DROP FUNCTION IF EXISTS public.check_usage_allowed(NUMERIC);

DROP TABLE IF EXISTS public.api_usage;
DROP TABLE IF EXISTS public.tier_limits;

COMMENT ON TABLE public.point_transactions IS
  'Unified usage + billing ledger. Deductions only via charge_operation / charge_llm_call.';
COMMENT ON TABLE public.user_credits IS
  'Mutable points balance (4 buckets). Ledger history in point_transactions.';

GRANT EXECUTE ON FUNCTION public.get_tier_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tier_config(TEXT) TO anon;
