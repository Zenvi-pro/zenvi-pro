-- ── point_transactions ────────────────────────────────────────────────────────
-- Immutable audit log. Every points change (deduction, allocation, rollover,
-- bonus, topup, refund) writes a row here. This is the source of truth for
-- disputes and debugging. Never updated, only inserted.

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Type of transaction
  txn_type      TEXT NOT NULL,      -- allocation | deduction | rollover | bonus |
                                    -- topup | overage_charge | refund
  -- Signed delta: positive = credits added, negative = credits deducted
  points_delta  INTEGER NOT NULL,
  -- Which bucket was affected
  bucket        TEXT NOT NULL,      -- subscription | rollover | bonus | topup | overage
  -- Context
  operation     TEXT,               -- e.g. 'video_generation', 'indexing', 'chat', 'referral'
  provider      TEXT,               -- e.g. 'runware', 'twelvelabs', 'openai'
  session_id    TEXT,               -- desktop or web session
  -- Balance snapshot after this transaction (for auditing)
  balance_after INTEGER,
  -- Overage USD charged (only set for overage_charge rows)
  overage_usd   NUMERIC(10,6),
  -- If this was a failed operation and refunded, link to original txn
  refund_of     UUID REFERENCES public.point_transactions(id),
  -- Notes (e.g. "generation failed — full refund")
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);

-- Index for common queries: user's recent history, month totals
CREATE INDEX IF NOT EXISTS pt_user_created_idx
  ON public.point_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pt_user_type_idx
  ON public.point_transactions (user_id, txn_type);

-- ── deduct_points ─────────────────────────────────────────────────────────────
-- Atomically deducts points from a user's balance following draw order:
--   1. rollover_points
--   2. subscription_points
--   3. bonus_points
--   4. topup_points
--
-- Returns: 'ok' | 'insufficient' | 'standard_mode'
-- 'insufficient' means not enough points AND overage is not enabled.
-- 'standard_mode' means 0 points, no overage — caller should use fallback models.
--
-- IMPORTANT: Call this ONLY after a successful API response, never before.
-- For failed generations, call refund_points() instead.

CREATE OR REPLACE FUNCTION public.deduct_points(
  p_points     INTEGER,
  p_operation  TEXT,
  p_provider   TEXT   DEFAULT NULL,
  p_session_id TEXT   DEFAULT NULL,
  p_note       TEXT   DEFAULT NULL
)
RETURNS TEXT   -- 'ok' | 'insufficient' | 'standard_mode'
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
  v_txn_id      UUID;
BEGIN
  -- Lock the user's credits row for this transaction
  SELECT * INTO v_uc
  FROM public.user_credits
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'insufficient';
  END IF;

  v_total_avail := v_uc.rollover_points + v_uc.subscription_points
                 + v_uc.bonus_points    + v_uc.topup_points;

  -- Not enough points and overage not enabled → standard mode
  IF v_total_avail < p_points AND NOT v_uc.overage_enabled THEN
    -- Mark user as in standard mode
    UPDATE public.user_credits
    SET in_standard_mode = TRUE
    WHERE user_id = auth.uid();
    RETURN 'standard_mode';
  END IF;

  -- Not enough points but overage IS enabled → we'll handle overage below
  -- For now, deduct whatever is available then note the shortfall
  -- (overage billing happens via Stripe at end of cycle, tracked separately)

  -- Draw from rollover first
  IF v_remaining > 0 AND v_uc.rollover_points > 0 THEN
    v_from_roll   := LEAST(v_remaining, v_uc.rollover_points);
    v_remaining   := v_remaining - v_from_roll;
  END IF;

  -- Then subscription
  IF v_remaining > 0 AND v_uc.subscription_points > 0 THEN
    v_from_sub    := LEAST(v_remaining, v_uc.subscription_points);
    v_remaining   := v_remaining - v_from_sub;
  END IF;

  -- Then bonus
  IF v_remaining > 0 AND v_uc.bonus_points > 0 THEN
    v_from_bonus  := LEAST(v_remaining, v_uc.bonus_points);
    v_remaining   := v_remaining - v_from_bonus;
  END IF;

  -- Then topup
  IF v_remaining > 0 AND v_uc.topup_points > 0 THEN
    v_from_topup  := LEAST(v_remaining, v_uc.topup_points);
    v_remaining   := v_remaining - v_from_topup;
  END IF;

  -- Apply deductions
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

  -- Log the transaction
  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket,
    operation, provider, session_id, balance_after, note
  ) VALUES (
    auth.uid(), 'deduction', -p_points, 'subscription',
    p_operation, p_provider, p_session_id,
    v_total_avail - (p_points - v_remaining),
    p_note
  )
  RETURNING id INTO v_txn_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_points(INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── refund_points ─────────────────────────────────────────────────────────────
-- Refunds points from a failed or errored operation.
-- Returns points to subscription bucket (simplest — avoids rollover contamination).
-- Caller passes the txn_id of the original deduction so we can link records.

CREATE OR REPLACE FUNCTION public.refund_points(
  p_points      INTEGER,
  p_operation   TEXT,
  p_original_txn UUID  DEFAULT NULL,
  p_note        TEXT  DEFAULT 'Operation failed — full refund'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.user_credits
  SET subscription_points = subscription_points + p_points,
      in_standard_mode    = FALSE   -- coming back from standard mode if applicable
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

GRANT EXECUTE ON FUNCTION public.refund_points(INTEGER, TEXT, UUID, TEXT) TO authenticated;

-- ── credit_points ─────────────────────────────────────────────────────────────
-- Adds points to a specific bucket. Used by:
--  - Stripe webhook (subscription allocation → 'subscription' bucket)
--  - Rollover calc at renewal (→ 'rollover' bucket)
--  - Bonus events (→ 'bonus' bucket)
--  - Top-up pack purchase (→ 'topup' bucket)
--
-- This is SECURITY DEFINER so only trusted server-side callers can use it for
-- subscription and rollover. Bonus self-serve claims go through award_bonus().

CREATE OR REPLACE FUNCTION public.credit_points(
  p_user_id    UUID,
  p_points     INTEGER,
  p_bucket     TEXT,    -- subscription | rollover | bonus | topup
  p_txn_type   TEXT,    -- allocation | rollover | bonus | topup
  p_operation  TEXT  DEFAULT NULL,
  p_note       TEXT  DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Ensure row exists
  INSERT INTO public.user_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Credit the correct bucket
  UPDATE public.user_credits
  SET
    subscription_points = subscription_points + CASE WHEN p_bucket = 'subscription' THEN p_points ELSE 0 END,
    rollover_points     = rollover_points     + CASE WHEN p_bucket = 'rollover'     THEN p_points ELSE 0 END,
    bonus_points        = bonus_points        + CASE WHEN p_bucket = 'bonus'        THEN p_points ELSE 0 END,
    topup_points        = topup_points        + CASE WHEN p_bucket = 'topup'        THEN p_points ELSE 0 END,
    in_standard_mode    = FALSE   -- receiving credits takes you out of standard mode
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_balance;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket, operation, balance_after, note
  ) VALUES (
    p_user_id, p_txn_type, p_points, p_bucket, p_operation, v_balance, p_note
  );
END;
$$;

-- Only service role (Stripe webhook) and other internal functions call this directly.
-- authenticated users cannot call credit_points — they go through award_bonus().
GRANT EXECUTE ON FUNCTION public.credit_points(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ── get_point_history ─────────────────────────────────────────────────────────
-- Returns recent point transactions for the dashboard credit history view.
CREATE OR REPLACE FUNCTION public.get_point_history(p_limit INT DEFAULT 50)
RETURNS TABLE(
  id           UUID,
  txn_type     TEXT,
  points_delta INTEGER,
  bucket       TEXT,
  operation    TEXT,
  provider     TEXT,
  balance_after INTEGER,
  note         TEXT,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id, pt.txn_type, pt.points_delta, pt.bucket,
    pt.operation, pt.provider, pt.balance_after, pt.note, pt.created_at
  FROM public.point_transactions pt
  WHERE pt.user_id = auth.uid()
  ORDER BY pt.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_point_history(INT) TO authenticated;
