-- Signup free credits: grant free-tier monthly_points on account creation
-- (operation = signup_free), and ensure monthly free cron SETs via
-- allocate_free_tier_for_user instead of stacking with credit_points.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. handle_new_user — insert credits, SET free allotment, ledger signup_free
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_pts INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_credits (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT monthly_points INTO v_free_pts
  FROM public.tier_config
  WHERE tier = 'free';

  IF v_free_pts IS NOT NULL AND v_free_pts > 0 THEN
    UPDATE public.user_credits
    SET subscription_points = v_free_pts,
        in_standard_mode = FALSE
    WHERE user_id = new.id;

    INSERT INTO public.point_transactions (
      user_id, txn_type, points_delta, bucket, operation, note, balance_after
    ) VALUES (
      new.id, 'allocation', v_free_pts, 'subscription',
      'signup_free',
      format('Signup free allotment — %s pts', v_free_pts),
      (SELECT total_points FROM public.user_credits WHERE user_id = new.id)
    );
  END IF;

  RETURN new;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. allocate_free_tier_for_user — skip if signup_free already this month
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

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing')
      AND s.tier IS DISTINCT FROM 'free'
  ) INTO v_has_paid;
  IF v_has_paid THEN
    RETURN FALSE;
  END IF;

  -- Idempotent per calendar month (signup or monthly renewal)
  SELECT COUNT(*) INTO v_already
  FROM public.point_transactions pt
  WHERE pt.user_id = p_user_id
    AND pt.txn_type = 'allocation'
    AND pt.operation IN ('free_tier_monthly', 'signup_free')
    AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());
  IF v_already > 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

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
-- 3. allocate_free_tier_monthly — SET via allocate_free_tier_for_user (no stack)
-- ═════════════════════════════════════════════════════════════════════════════
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
  FOR r IN
    SELECT u.id AS user_id
    FROM auth.users u
  LOOP
    IF public.allocate_free_tier_for_user(r.user_id) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_free_tier_monthly() TO service_role;

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates profile + user_credits and SETs free-tier signup allotment (signup_free).';
COMMENT ON FUNCTION public.allocate_free_tier_monthly IS
  'Cron entry: SETs free allotment per free user via allocate_free_tier_for_user (no stacking).';
