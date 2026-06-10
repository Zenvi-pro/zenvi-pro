-- Award free_tier_monthly credits on sign-up and every calendar month for all users
-- (including paid subscribers — stacked in subscription bucket after plan allocation).

-- ── 1. Per-user helper (idempotent per calendar month) ───────────────────────

CREATE OR REPLACE FUNCTION public.allocate_free_tier_for_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_pts INTEGER;
  v_already  INTEGER;
BEGIN
  SELECT monthly_points INTO v_free_pts
  FROM public.tier_config
  WHERE tier = 'free';

  IF v_free_pts IS NULL OR v_free_pts <= 0 THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO v_already
  FROM public.point_transactions pt
  WHERE pt.user_id   = p_user_id
    AND pt.txn_type  = 'allocation'
    AND pt.operation = 'free_tier_monthly'
    AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());

  IF v_already > 0 THEN
    RETURN FALSE;
  END IF;

  PERFORM public.credit_points(
    p_user_id,
    v_free_pts,
    'subscription',
    'allocation',
    'free_tier_monthly',
    'Free tier monthly allocation'
  );

  RETURN TRUE;
END;
$$;

-- Internal only — called from triggers and other SECURITY DEFINER functions.

-- ── 2. Monthly cron entry point — all users ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.allocate_free_tier_monthly()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  r       RECORD;
BEGIN
  FOR r IN SELECT u.id AS user_id FROM auth.users u
  LOOP
    IF public.allocate_free_tier_for_user(r.user_id) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_free_tier_monthly() TO service_role;

-- ── 3. Sign-up trigger — award on auth.users INSERT ──────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_credits (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.allocate_free_tier_for_user(NEW.id);

  RETURN new;
END;
$$;

-- ── 4. Paid allocation — stack free tier after plan credits ──────────────────

CREATE OR REPLACE FUNCTION public.allocate_monthly_points(
  p_user_id          UUID,
  p_tier             TEXT,
  p_billing_interval TEXT
)
RETURNS VOID
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
  v_free_pts       INTEGER;
  v_current_sub    INTEGER;
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
    bonus_points        = 0,
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

  -- Stack free tier after plan credits (re-award if signup credits were replaced by reset).
  SELECT monthly_points INTO v_free_pts FROM public.tier_config WHERE tier = 'free';
  IF v_free_pts > 0 THEN
    SELECT subscription_points INTO v_current_sub
    FROM public.user_credits WHERE user_id = p_user_id;
    IF v_current_sub < v_new_points + v_free_pts THEN
      PERFORM public.credit_points(
        p_user_id,
        v_new_points + v_free_pts - v_current_sub,
        'subscription',
        'allocation',
        'free_tier_monthly',
        'Free tier monthly allocation'
      );
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_monthly_points(UUID, TEXT, TEXT) TO service_role;

-- ── 5. Backfill users missing this month's free tier ─────────────────────────

SELECT public.allocate_free_tier_monthly() AS users_allocated_on_backfill;
