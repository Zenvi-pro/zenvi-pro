-- Grant lifetime access to nilay@zenvi.pro
-- This manually provisions the account as if the lifetime plan was purchased.
-- Safe to re-run (idempotent).

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'nilay@zenvi.pro' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User nilay@zenvi.pro not found yet — will need to re-run after sign-up.';
    RETURN;
  END IF;

  -- Ensure profile row exists
  INSERT INTO public.profiles (id, email)
  VALUES (v_user_id, 'nilay@zenvi.pro')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure user_credits row exists
  INSERT INTO public.user_credits (user_id, billing_interval)
  VALUES (v_user_id, 'lifetime')
  ON CONFLICT (user_id) DO UPDATE SET billing_interval = 'lifetime';

  -- Upsert subscription as lifetime/active
  INSERT INTO public.subscriptions (
    user_id,
    tier,
    status,
    billing_interval,
    current_period_end,
    cancel_at_period_end
  )
  VALUES (
    v_user_id,
    'lifetime',
    'active',
    'lifetime',
    NULL,
    FALSE
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier               = 'lifetime',
    status             = 'active',
    billing_interval   = 'lifetime',
    current_period_end = NULL,
    cancel_at_period_end = FALSE,
    updated_at         = NOW();

  -- Allocate lifetime points (creates/updates user_credits)
  PERFORM public.allocate_monthly_points(v_user_id, 'lifetime', 'lifetime');

  RAISE NOTICE 'Lifetime access granted to nilay@zenvi.pro (user_id: %)', v_user_id;
END $$;
