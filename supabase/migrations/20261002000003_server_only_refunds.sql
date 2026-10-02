-- ============================================================================
-- Refunds are issued by the server, one charge at a time
-- ============================================================================
-- refund_points ran as the signed-in user, so the user could call it directly.
-- The previous migration capped it at what had been charged, which stopped a
-- balance being inflated but still let someone refund a charge they owed.
--
-- The backend now refunds through refund_points_for_user, which only the
-- service role may execute. It refunds one specific charge, found by the
-- idempotency key the charge was deducted under:
--
--   * once -- a second call for the same charge returns 0, so a retry cannot
--     draw on another, successful charge for the same operation;
--   * at most what that charge took from the balance. With pay-as-you-go on,
--     deduct_points records the full price but can only take what the buckets
--     held; refunding the full price would hand back credits never taken.
--
-- Returns the amount refunded. refund_points stays defined but is no longer
-- callable from the API.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refund_points_for_user(
  p_user_id    UUID,
  p_points     INTEGER,
  p_operation  TEXT,
  p_charge_key TEXT,
  p_note       TEXT DEFAULT 'Operation failed — full refund'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_charge  public.point_transactions%ROWTYPE;
  v_before  INTEGER;
  v_taken   INTEGER;
  v_points  INTEGER;
  v_balance INTEGER;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_points, 0) <= 0 OR COALESCE(p_charge_key, '') = '' THEN
    RETURN 0;
  END IF;

  -- One refund at a time per user, so two concurrent calls cannot both refund
  -- the same charge.
  PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_charge
  FROM public.point_transactions
  WHERE user_id = p_user_id
    AND txn_type = 'deduction'
    AND idempotency_key = p_charge_key
    AND operation = p_operation
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = p_user_id AND txn_type = 'refund' AND refund_of = v_charge.id
  ) THEN
    RETURN 0;
  END IF;

  -- What the charge took from the balance. A charge that left credits behind
  -- was paid in full; one that emptied the balance took only what was there,
  -- which is the balance the transaction before it left.
  v_taken := -v_charge.points_delta;
  IF COALESCE(v_charge.balance_after, 1) <= 0 THEN
    SELECT balance_after INTO v_before
    FROM public.point_transactions
    WHERE user_id = p_user_id AND created_at < v_charge.created_at
    ORDER BY created_at DESC
    LIMIT 1;
    v_taken := LEAST(v_taken, GREATEST(COALESCE(v_before, v_taken), 0));
  END IF;

  v_points := LEAST(p_points, v_taken);
  IF v_points <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.user_credits
  SET subscription_points = subscription_points + v_points,
      in_standard_mode    = FALSE   -- coming back from standard mode if applicable
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_balance;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket,
    operation, balance_after, refund_of, note
  ) VALUES (
    p_user_id, 'refund', v_points, 'subscription',
    p_operation, v_balance, v_charge.id, p_note
  );

  RETURN v_points;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refund_points_for_user(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_points_for_user(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.refund_points(INTEGER, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
