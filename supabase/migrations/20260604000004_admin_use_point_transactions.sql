-- Admin metrics read cost from point_transactions (unified ledger)

CREATE OR REPLACE FUNCTION public.get_admin_summary()
RETURNS TABLE(
  total_paid_users     BIGINT,
  free_users           BIGINT,
  starter_count        BIGINT,
  pro_count            BIGINT,
  max_count            BIGINT,
  lifetime_count       BIGINT,
  legacy_count         BIGINT,
  est_mrr_usd          NUMERIC(12, 2),
  est_arr_usd          NUMERIC(12, 2),
  month_total_cost_usd NUMERIC(12, 2),
  month_credits_used   BIGINT,
  month_request_count  BIGINT,
  est_gross_profit_usd NUMERIC(12, 2),
  est_gross_margin_pct NUMERIC(5, 2),
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
    coalesce(SUM(coalesce(pt.cost_usd, 0)), 0)::NUMERIC(12, 2),
    coalesce(SUM(-pt.points_delta), 0)::BIGINT,
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

  RETURN QUERY
  WITH ptx AS (
    SELECT
      pt.user_id AS uid,
      SUM(-pt.points_delta)::BIGINT                    AS credits_used,
      SUM(coalesce(pt.cost_usd, 0))::NUMERIC(12, 4)  AS cost_usd,
      COUNT(*)::BIGINT                                 AS request_count
    FROM public.point_transactions pt
    WHERE pt.txn_type = 'deduction'
      AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now())
    GROUP BY pt.user_id
  )
  SELECT
    p.id,
    p.email,
    coalesce(s.tier, 'free'),
    coalesce(ptx.credits_used, 0),
    coalesce(ptx.cost_usd, 0),
    coalesce(ptx.request_count, 0),
    coalesce(uc.in_standard_mode, FALSE),
    coalesce(uc.overage_enabled, FALSE)
  FROM public.profiles p
  LEFT JOIN public.subscriptions s
    ON s.user_id = p.id AND s.status IN ('active', 'trialing')
  LEFT JOIN public.user_credits uc ON uc.user_id = p.id
  LEFT JOIN ptx ON ptx.uid = p.id
  WHERE coalesce(ptx.credits_used, 0) > 0
  ORDER BY credits_used DESC
  LIMIT p_limit;
END;
$$;
