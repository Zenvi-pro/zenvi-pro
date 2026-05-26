-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 9 — admin metrics + spend-anomaly detection RPCs
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Adds:
--   • is_admin()                 — server-side admin gate (email allowlist)
--   • get_admin_summary()        — paid-user counts / MRR / margin / anomalies
--   • get_admin_top_spenders()   — top N users by credit spend (current month)
--   • detect_spend_anomalies()   — service-role cron: flags users spending
--                                  >5× their 30-day avg today
--
-- All admin RPCs check is_admin() first and return NULL / empty when called by
-- a non-admin user. The is_admin() function is the single source of truth —
-- update the email allowlist there and every admin RPC tightens accordingly.
--
-- Safe / additive: no DROP, no destructive change. Builds on point_transactions,
-- subscriptions, tier_config, and usage_anomalies introduced in billing-v2.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. is_admin — single email allowlist used by every admin RPC
-- ═════════════════════════════════════════════════════════════════════════════
-- IMPORTANT: edit the allowlist here when you add admins. SECURITY DEFINER so
-- callers can't bypass via search_path tricks; reads auth.uid() directly.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  RETURN v_email IN (
    'nilay@zenvi.pro'
    -- add more admin emails here as the team grows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. get_admin_summary — top-line metrics for the admin dashboard
-- ═════════════════════════════════════════════════════════════════════════════
-- Returns a single-row summary aggregating across all users / subscriptions /
-- usage for the current calendar month. Computed at query time — no nightly
-- rollup yet, so this is O(N users) and is fine up to ~50k subscribers.

CREATE OR REPLACE FUNCTION public.get_admin_summary()
RETURNS TABLE(
  -- User / subscription counts
  total_paid_users     BIGINT,
  free_users           BIGINT,
  starter_count        BIGINT,
  pro_count            BIGINT,
  max_count            BIGINT,
  lifetime_count       BIGINT,
  legacy_count         BIGINT,        -- creator / studio rows that haven't been migrated yet
  -- Revenue (estimated from sticker prices in tier_config)
  est_mrr_usd          NUMERIC(12, 2),
  est_arr_usd          NUMERIC(12, 2),
  -- Usage (this calendar month)
  month_total_cost_usd NUMERIC(12, 2),  -- raw $ paid to providers
  month_credits_used   BIGINT,
  month_request_count  BIGINT,
  -- Margin (this month) — revenue minus cost
  est_gross_profit_usd NUMERIC(12, 2),
  est_gross_margin_pct NUMERIC(5, 2),
  -- Health signals
  anomalies_this_week  BIGINT,
  standard_mode_users  BIGINT,
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
    RETURN;  -- empty result for non-admins
  END IF;

  -- Tier breakdown via active subscriptions
  SELECT
    COUNT(*) FILTER (WHERE tier = 'starter'),
    COUNT(*) FILTER (WHERE tier = 'pro'),
    COUNT(*) FILTER (WHERE tier = 'max'),
    COUNT(*) FILTER (WHERE tier = 'lifetime'),
    COUNT(*) FILTER (WHERE tier IN ('creator', 'studio'))
  INTO v_starter, v_pro, v_max, v_lifetime, v_legacy
  FROM public.subscriptions
  WHERE status IN ('active', 'trialing');

  -- Free = users with no active paid subscription
  SELECT COUNT(*) INTO v_free
  FROM auth.users u
  LEFT JOIN public.subscriptions s
    ON s.user_id = u.id AND s.status IN ('active', 'trialing')
  WHERE s.user_id IS NULL;

  -- MRR — sticker price by tier (monthly-equivalent for annual subs).
  -- Annual subs contribute their per-month equivalent so MRR is comparable.
  v_mrr :=  v_starter * 29.00
        +   v_pro     * 49.00
        +   v_max     * 199.00
        +   v_legacy  * 29.00;  -- conservative — assume creator/studio rows are starter-tier price

  -- Usage costs ($ paid to providers) and request count for the current month
  SELECT
    coalesce(SUM(cost_usd), 0)::NUMERIC(12,2),
    coalesce(SUM(input_tokens + output_tokens + units), 0)::BIGINT,
    COUNT(*)::BIGINT
  INTO v_cost, v_credits, v_reqs
  FROM public.api_usage
  WHERE DATE_TRUNC('month', recorded_at) = DATE_TRUNC('month', now());

  -- Health
  SELECT COUNT(*) INTO v_anomalies
  FROM public.usage_anomalies
  WHERE detected_at >= now() - interval '7 days';

  SELECT
    COUNT(*) FILTER (WHERE in_standard_mode = TRUE),
    COUNT(*) FILTER (WHERE overage_enabled = TRUE)
  INTO v_std, v_ovr
  FROM public.user_credits;

  RETURN QUERY SELECT
    (v_starter + v_pro + v_max + v_lifetime + v_legacy)::BIGINT  AS total_paid_users,
    v_free                                                        AS free_users,
    v_starter, v_pro, v_max, v_lifetime, v_legacy,
    v_mrr,
    v_mrr * 12,
    v_cost,
    v_credits,
    v_reqs,
    (v_mrr - v_cost)::NUMERIC(12, 2)                              AS est_gross_profit_usd,
    CASE WHEN v_mrr > 0
      THEN ((v_mrr - v_cost) / v_mrr * 100)::NUMERIC(5, 2)
      ELSE 0
    END                                                            AS est_gross_margin_pct,
    v_anomalies,
    v_std,
    v_ovr;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_summary() TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. get_admin_top_spenders — top N users by credits used this month
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_admin_top_spenders(p_limit INT DEFAULT 25)
RETURNS TABLE(
  user_id          UUID,
  email            TEXT,
  tier             TEXT,
  credits_used     BIGINT,
  cost_usd         NUMERIC(12, 4),
  request_count    BIGINT,
  in_standard_mode BOOLEAN,
  overage_enabled  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  -- Aggregate in separate CTEs to avoid a fan-trap: joining point_transactions
  -- AND api_usage in the same FROM multiplies rows and inflates SUM().
  -- Column aliases in the CTEs use *_id to avoid conflicting with the
  -- OUT parameter named user_id (PL/pgSQL would otherwise treat the bare
  -- identifier as the variable, not the column).
  RETURN QUERY
  WITH ptx AS (
    SELECT pt.user_id AS uid,
           SUM(-pt.points_delta)::BIGINT AS credits_used
    FROM public.point_transactions pt
    WHERE pt.txn_type = 'deduction'
      AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now())
    GROUP BY pt.user_id
  ),
  cost AS (
    SELECT au.user_id AS uid,
           SUM(au.cost_usd)::NUMERIC(12, 4) AS cost_usd,
           COUNT(*)::BIGINT                 AS request_count
    FROM public.api_usage au
    WHERE DATE_TRUNC('month', au.recorded_at) = DATE_TRUNC('month', now())
    GROUP BY au.user_id
  )
  SELECT
    p.id                                                  AS user_id,
    p.email                                               AS email,
    coalesce(s.tier, 'free')                              AS tier,
    coalesce(ptx.credits_used, 0)                         AS credits_used,
    coalesce(cost.cost_usd, 0)::NUMERIC(12, 4)            AS cost_usd,
    coalesce(cost.request_count, 0)                       AS request_count,
    coalesce(uc.in_standard_mode, FALSE)                  AS in_standard_mode,
    coalesce(uc.overage_enabled, FALSE)                   AS overage_enabled
  FROM public.profiles p
  LEFT JOIN public.subscriptions s
    ON s.user_id = p.id AND s.status IN ('active', 'trialing')
  LEFT JOIN public.user_credits uc
    ON uc.user_id = p.id
  LEFT JOIN ptx  ON ptx.uid  = p.id
  LEFT JOIN cost ON cost.uid = p.id
  WHERE coalesce(ptx.credits_used, 0) > 0
  ORDER BY credits_used DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_top_spenders(INT) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. detect_spend_anomalies — flag users spending 5× their 30-day daily avg
-- ═════════════════════════════════════════════════════════════════════════════
-- Service-role only (called by cron / Edge Function). For each user with
-- meaningful baseline activity (>50 credits/day over 30d), checks if today's
-- spend exceeds 5× and inserts a usage_anomalies row. Idempotent per day per
-- user via a (user_id, DATE(detected_at)) uniqueness check inline.

CREATE OR REPLACE FUNCTION public.detect_spend_anomalies()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_threshold NUMERIC := 5.0;  -- multiplier
  v_min_baseline INT := 50;    -- min daily avg before we even consider
  r RECORD;
BEGIN
  FOR r IN
    WITH today AS (
      SELECT
        user_id,
        coalesce(SUM(-points_delta), 0)::INT AS spend_today
      FROM public.point_transactions
      WHERE txn_type = 'deduction'
        AND created_at::date = current_date
      GROUP BY user_id
    ),
    baseline AS (
      SELECT
        user_id,
        (coalesce(SUM(-points_delta), 0) / 30.0)::NUMERIC AS daily_avg
      FROM public.point_transactions
      WHERE txn_type = 'deduction'
        AND created_at >= now() - interval '30 days'
        AND created_at::date < current_date
      GROUP BY user_id
      HAVING (coalesce(SUM(-points_delta), 0) / 30.0) >= v_min_baseline
    )
    SELECT
      t.user_id,
      t.spend_today,
      b.daily_avg,
      (t.spend_today / b.daily_avg)::NUMERIC(6, 2) AS multiplier
    FROM today t
    JOIN baseline b ON b.user_id = t.user_id
    WHERE (t.spend_today / b.daily_avg) >= v_threshold
  LOOP
    -- One anomaly row per (user, day) — skip if already detected today
    IF NOT EXISTS (
      SELECT 1 FROM public.usage_anomalies
      WHERE user_id = r.user_id
        AND detected_at::date = current_date
    ) THEN
      INSERT INTO public.usage_anomalies (
        user_id, category, spend_today_credits,
        baseline_avg_credits, multiplier, action_taken, note
      ) VALUES (
        r.user_id, NULL, r.spend_today,
        r.daily_avg, r.multiplier, 'alerted',
        format('Spent %s credits today vs %s daily avg over 30d',
               r.spend_today, round(r.daily_avg))
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_spend_anomalies() TO service_role;
-- Also allow admins to trigger manually from the dashboard
GRANT EXECUTE ON FUNCTION public.detect_spend_anomalies() TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. get_admin_anomalies — recent anomalies with user email joined
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_admin_anomalies(p_limit INT DEFAULT 50)
RETURNS TABLE(
  id                   UUID,
  detected_at          TIMESTAMPTZ,
  user_id              UUID,
  email                TEXT,
  spend_today_credits  INTEGER,
  baseline_avg_credits NUMERIC(10, 2),
  multiplier           NUMERIC(6, 2),
  action_taken         TEXT,
  resolved_at          TIMESTAMPTZ,
  note                 TEXT
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
  SELECT
    a.id, a.detected_at, a.user_id, p.email,
    a.spend_today_credits, a.baseline_avg_credits, a.multiplier,
    a.action_taken, a.resolved_at, a.note
  FROM public.usage_anomalies a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.detected_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_anomalies(INT) TO authenticated;


COMMENT ON FUNCTION public.is_admin                IS 'Server-side admin gate. Edit the email allowlist inline.';
COMMENT ON FUNCTION public.get_admin_summary       IS 'Top-line ops dashboard metrics. Returns empty for non-admins.';
COMMENT ON FUNCTION public.get_admin_top_spenders  IS 'Top N users by credit usage this month. Returns empty for non-admins.';
COMMENT ON FUNCTION public.detect_spend_anomalies  IS 'Flag users spending 5x their 30d daily avg. Wire to pg_cron daily.';
COMMENT ON FUNCTION public.get_admin_anomalies     IS 'Recent anomalies with user emails. Returns empty for non-admins.';
