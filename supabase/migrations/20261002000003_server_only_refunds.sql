-- ============================================================================
-- Refunds are issued by the server
-- ============================================================================
-- refund_points ran as the signed-in user, so the user could call it directly.
-- The previous migration capped it at what had been charged, which stopped a
-- balance being inflated but still let someone refund a charge they owed.
--
-- The backend now refunds through refund_points_for_user, which only the
-- service role may execute and which names the user. Same cap: at most what
-- that user was charged for the operation in the last 24 hours, less what has
-- already been refunded. Returns the amount actually refunded.
--
-- refund_points stays defined but is no longer callable from the API.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refund_points_for_user(
  p_user_id      UUID,
  p_points       INTEGER,
  p_operation    TEXT,
  p_original_txn UUID DEFAULT NULL,
  p_note         TEXT DEFAULT 'Operation failed — full refund'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_balance    INTEGER;
  v_refundable INTEGER;
  v_points     INTEGER;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_points, 0) <= 0 THEN
    RETURN 0;
  END IF;

  -- One refund at a time per user, so two concurrent calls cannot both claim
  -- the same charge.
  PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(-points_delta) FILTER (WHERE txn_type = 'deduction'), 0)
       - COALESCE(SUM(points_delta)  FILTER (WHERE txn_type = 'refund'), 0)
  INTO v_refundable
  FROM public.point_transactions
  WHERE user_id = p_user_id
    AND operation = p_operation
    AND created_at > now() - interval '24 hours';

  v_points := LEAST(p_points, GREATEST(COALESCE(v_refundable, 0), 0));
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
    p_operation, v_balance, p_original_txn, p_note
  );

  RETURN v_points;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refund_points_for_user(UUID, INTEGER, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_points_for_user(UUID, INTEGER, TEXT, UUID, TEXT)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.refund_points(INTEGER, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
