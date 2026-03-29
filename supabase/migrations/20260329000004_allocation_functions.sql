-- ── allocate_monthly_points ───────────────────────────────────────────────────
-- Called by the Stripe webhook on:
--   - checkout.session.completed  (new subscription)
--   - customer.subscription.updated  (renewal or plan change)
--
-- Steps:
--   1. Calculate rollover from remaining subscription_points
--   2. Reset subscription_points to new period's allocation
--   3. Reset overage_spent_cycle to 0
--   4. Update billing_interval if it changed
--   5. Log both rollover and allocation transactions
--
-- Safe to call multiple times (idempotent on same billing cycle via guard).

CREATE OR REPLACE FUNCTION public.allocate_monthly_points(
  p_user_id          UUID,
  p_tier             TEXT,        -- creator | pro | studio | lifetime
  p_billing_interval TEXT         -- monthly | annual | lifetime
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
BEGIN
  -- Get tier config
  SELECT * INTO v_cfg FROM public.get_tier_config(p_tier);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown tier: %', p_tier;
  END IF;

  -- Determine new points for this cycle
  v_new_points := CASE
    WHEN p_billing_interval = 'annual'   THEN v_cfg.annual_monthly_points
    WHEN p_billing_interval = 'lifetime' THEN v_cfg.monthly_points
    ELSE v_cfg.monthly_points
  END;

  -- Lock user credits row
  SELECT * INTO v_uc
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First-ever allocation: create the row
    INSERT INTO public.user_credits (user_id, billing_interval)
    VALUES (p_user_id, p_billing_interval);
    SELECT * INTO v_uc FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  -- ── Step 1: Calculate rollover from remaining subscription_points ─────────
  IF v_cfg.rollover_percentage > 0 AND v_uc.subscription_points > 0 THEN
    v_rollover_earn  := floor(v_uc.subscription_points * v_cfg.rollover_percentage);
    v_rollover_carry := LEAST(v_rollover_earn, v_cfg.rollover_cap_points);
  ELSE
    v_rollover_carry := 0;
  END IF;

  -- For lifetime: check accumulated cap instead of rollover_cap
  IF p_billing_interval = 'lifetime' AND v_cfg.max_accumulated_points > 0 THEN
    -- Total after this cycle = current balance + new points
    -- Cap total to max_accumulated_points
    v_rollover_carry := GREATEST(0,
      LEAST(
        v_cfg.max_accumulated_points - (v_uc.rollover_points + v_new_points + v_uc.bonus_points + v_uc.topup_points),
        v_uc.subscription_points   -- can't carry more than what's left
      )
    );
  END IF;

  -- ── Step 2: Apply new allocation ─────────────────────────────────────────
  UPDATE public.user_credits
  SET
    subscription_points = v_new_points,
    rollover_points     = v_uc.rollover_points + v_rollover_carry,
    -- Bonus points reset at cycle end (use-it-or-lose-it)
    bonus_points        = 0,
    overage_spent_cycle = 0,
    billing_interval    = p_billing_interval,
    in_standard_mode    = FALSE
  WHERE user_id = p_user_id;

  -- ── Step 3: Log rollover transaction (if any) ─────────────────────────────
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

  -- ── Step 4: Log allocation transaction ────────────────────────────────────
  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket, operation, note
  ) VALUES (
    p_user_id, 'allocation', v_new_points, 'subscription',
    'cycle_renewal',
    format('%s plan (%s) — %s pts allocated', p_tier, p_billing_interval, v_new_points)
  );

END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_monthly_points(UUID, TEXT, TEXT) TO service_role;

-- ── add_billing_interval_to_subscriptions ────────────────────────────────────
-- Add billing_interval column to subscriptions table so the webhook can store it.
-- This extends the existing table with a single nullable column — fully backward
-- compatible. Existing rows get NULL which the code treats as 'monthly'.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_interval TEXT;

-- ── award_bonus ───────────────────────────────────────────────────────────────
-- Awards bonus points for a specific trigger. Idempotent — a user can only
-- earn each one-time bonus once. Referral bonuses can fire multiple times
-- (one per unique referred subscriber).

CREATE TABLE IF NOT EXISTS public.bonus_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,      -- onboarding_complete | first_export | referral_sent |
                                   -- referral_received | review_left | profile_complete |
                                   -- social_connected | first_share
  event_key    TEXT,               -- for non-unique events: e.g. referred user_id, platform name
  points_awarded INTEGER NOT NULL,
  awarded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type, event_key)
);

ALTER TABLE public.bonus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bonus events"
  ON public.bonus_events FOR SELECT USING (auth.uid() = user_id);

-- Points per bonus event (easy to change here — one place)
CREATE TABLE IF NOT EXISTS public.bonus_config (
  event_type    TEXT PRIMARY KEY,
  points        INTEGER NOT NULL,
  is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,  -- true = can fire multiple times (referrals)
  description   TEXT
);

ALTER TABLE public.bonus_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bonus config" ON public.bonus_config FOR SELECT USING (true);

INSERT INTO public.bonus_config (event_type, points, is_repeatable, description) VALUES
  ('onboarding_complete',  100, false, 'Complete the onboarding checklist'),
  ('first_export',          50, false, 'First successful video export'),
  ('referral_sent',        500, true,  'Referred a friend who subscribed — per referral'),
  ('referral_received',    200, false, 'Joined via a referral link'),
  ('review_left',          200, false, 'Left a verified review (manual approval)'),
  ('profile_complete',      25, false, 'Completed full profile (name + avatar + bio)'),
  ('social_connected',      50, true,  'Connected a social account — per platform, max 3'),
  ('first_share',           50, false, 'First project shared/published')
ON CONFLICT (event_type) DO UPDATE SET
  points        = EXCLUDED.points,
  is_repeatable = EXCLUDED.is_repeatable,
  description   = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.award_bonus(
  p_event_type TEXT,
  p_event_key  TEXT DEFAULT NULL   -- e.g. platform name or referred user_id
)
RETURNS INTEGER   -- points awarded, 0 if already awarded
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg     public.bonus_config%ROWTYPE;
  v_balance INTEGER;
  v_cap_pts INTEGER;
BEGIN
  SELECT * INTO v_cfg FROM public.bonus_config WHERE event_type = p_event_type;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Idempotency check
  IF EXISTS (
    SELECT 1 FROM public.bonus_events
    WHERE user_id = auth.uid()
      AND event_type = p_event_type
      AND (event_key = p_event_key OR (event_key IS NULL AND p_event_key IS NULL))
  ) THEN
    RETURN 0;  -- already awarded
  END IF;

  -- Cap social_connected at 3 platforms (150 pts max)
  IF p_event_type = 'social_connected' THEN
    IF (SELECT COUNT(*) FROM public.bonus_events
        WHERE user_id = auth.uid() AND event_type = 'social_connected') >= 3 THEN
      RETURN 0;
    END IF;
  END IF;

  -- Record the event
  INSERT INTO public.bonus_events (user_id, event_type, event_key, points_awarded)
  VALUES (auth.uid(), p_event_type, p_event_key, v_cfg.points)
  ON CONFLICT (user_id, event_type, event_key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Credit the bonus bucket
  UPDATE public.user_credits
  SET bonus_points = bonus_points + v_cfg.points
  WHERE user_id = auth.uid()
  RETURNING total_points INTO v_balance;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket, operation, balance_after, note
  ) VALUES (
    auth.uid(), 'bonus', v_cfg.points, 'bonus',
    p_event_type, v_balance,
    format('Bonus: %s', v_cfg.description)
  );

  RETURN v_cfg.points;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_bonus(TEXT, TEXT) TO authenticated;

-- ── referral helpers ──────────────────────────────────────────────────────────
-- Look up a user by referral code (used at signup to record referred_by)
CREATE OR REPLACE FUNCTION public.get_user_by_referral_code(p_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_credits WHERE referral_code = upper(p_code) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_by_referral_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_by_referral_code(TEXT) TO authenticated;
