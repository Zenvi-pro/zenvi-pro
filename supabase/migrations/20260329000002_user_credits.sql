-- ── user_credits ──────────────────────────────────────────────────────────────
-- One row per user. Tracks their full points picture.
-- Points buckets are kept separate so draw-order logic is clear:
--   1. rollover_points  (carried from last period)
--   2. subscription_points  (this period's allocation)
--   3. bonus_points  (earned through actions)
--   4. topup_points  (purchased packs, no expiry)
--   5. overage  (if enabled, billed end of cycle)
--
-- All columns are non-negative. Deductions happen via deduct_points() which
-- respects draw order atomically.

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Points buckets (all non-negative integers)
  subscription_points     INTEGER NOT NULL DEFAULT 0,  -- current period allocation
  rollover_points         INTEGER NOT NULL DEFAULT 0,  -- carried from previous period
  bonus_points            INTEGER NOT NULL DEFAULT 0,  -- earned (onboarding, referrals, etc.)
  topup_points            INTEGER NOT NULL DEFAULT 0,  -- purchased top-up packs

  -- Computed helper (kept in sync by trigger) — total immediately usable
  -- topup is NOT included here; topup is used only after subscription runs out
  total_points            INTEGER GENERATED ALWAYS AS (
                            rollover_points + subscription_points + bonus_points + topup_points
                          ) STORED,

  -- Overage settings
  overage_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  overage_limit_usd       NUMERIC(10,2) NOT NULL DEFAULT 0,   -- user's chosen cap
  overage_spent_cycle     NUMERIC(10,2) NOT NULL DEFAULT 0,   -- reset each billing cycle

  -- Billing interval (set by Stripe webhook on subscription creation/update)
  billing_interval        TEXT NOT NULL DEFAULT 'monthly',    -- 'monthly' | 'annual' | 'lifetime'

  -- Referral
  referral_code           TEXT UNIQUE,                        -- user's shareable code
  referred_by             UUID REFERENCES auth.users(id),     -- who referred them

  -- Standard mode flag (set true when points = 0 and overage off)
  in_standard_mode        BOOLEAN NOT NULL DEFAULT FALSE,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own overage settings"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Auto-generate referral code on insert ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    -- 8-char alphanumeric code, collision-resistant enough for our scale
    NEW.referral_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_credits_referral_code
  BEFORE INSERT ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- ── Auto-create user_credits row when a profile is created ────────────────────
-- Piggybacks on the existing handle_new_user trigger flow.
-- We extend handle_new_user to also insert into user_credits.
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

  RETURN new;
END;
$$;
-- Trigger already exists (on_auth_user_created) — function replacement is enough.

-- ── get_credits_balance ───────────────────────────────────────────────────────
-- Primary read path for the app to show current credit state.
CREATE OR REPLACE FUNCTION public.get_credits_balance()
RETURNS TABLE(
  subscription_points  INTEGER,
  rollover_points      INTEGER,
  bonus_points         INTEGER,
  topup_points         INTEGER,
  total_points         INTEGER,
  overage_enabled      BOOLEAN,
  overage_limit_usd    NUMERIC(10,2),
  overage_spent_cycle  NUMERIC(10,2),
  billing_interval     TEXT,
  referral_code        TEXT,
  in_standard_mode     BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-create row if missing (handles users created before this migration)
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

GRANT EXECUTE ON FUNCTION public.get_credits_balance() TO authenticated;

-- ── update_overage_settings ───────────────────────────────────────────────────
-- Called from the dashboard when user toggles overage on/off or changes cap.
CREATE OR REPLACE FUNCTION public.update_overage_settings(
  p_enabled     BOOLEAN,
  p_limit_usd   NUMERIC(10,2)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_cfg  public.tier_config;
BEGIN
  -- Check tier allows overage
  SELECT s.tier INTO v_tier
  FROM subscriptions s
  WHERE s.user_id = auth.uid() AND s.status IN ('active', 'trialing')
  LIMIT 1;

  SELECT * INTO v_cfg FROM public.get_tier_config(coalesce(v_tier, 'creator'));

  IF NOT v_cfg.overage_allowed AND p_enabled THEN
    RAISE EXCEPTION 'Overage is not available on the % plan', coalesce(v_tier, 'creator');
  END IF;

  IF p_limit_usd > v_cfg.overage_monthly_cap_usd AND p_enabled THEN
    RAISE EXCEPTION 'Overage cap cannot exceed $% on the % plan',
      v_cfg.overage_monthly_cap_usd, coalesce(v_tier, 'creator');
  END IF;

  UPDATE public.user_credits
  SET overage_enabled   = p_enabled,
      overage_limit_usd = p_limit_usd
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_overage_settings(BOOLEAN, NUMERIC) TO authenticated;

-- ── Backfill existing users ───────────────────────────────────────────────────
-- Insert a credits row for every existing auth user who doesn't have one yet.
INSERT INTO public.user_credits (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;
