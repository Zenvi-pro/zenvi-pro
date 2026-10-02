-- ============================================================================
-- Close what the public API key could reach
-- ============================================================================
-- The anon key ships in the desktop app and the website, so anything the `anon`
-- and `authenticated` roles can do, anyone can do with curl. Audited 2026-10-02
-- (zenvi-core#263). Four things were open:
--
-- 1. Ten tables had row-level security off and full grants to both roles:
--    every user's video index (video_catalog, video_rag_nodes), the assistant's
--    memory (store, store_vectors) and the LangGraph chat state (checkpoint*).
--    Readable, writable and deletable by anyone. Writable matters most: memory
--    and scene descriptions are fed to the assistant as context, so a stranger
--    could plant instructions there for another user's agent to act on --
--    including paid generation.
--
--    RLS was left off "for speed". It costs the backend nothing either way:
--    the backend connects as `postgres`, which owns these tables and bypasses
--    RLS. Turning it on only affects the API roles, which have no business here.
--
-- 2. Functions that hand out credits were callable by anyone, signed in or not:
--    credit_points(user, points, ...) and allocate_monthly_points(user, tier, ...)
--    take a user id and trust it. One request was enough for unlimited credits.
--
-- 3. A signed-in user could raise their own balance: user_credits allowed
--    updating one's own row with every column writable, and refund_points
--    refunded any amount asked for.
--
-- 4. is_admin() read the email from profiles, which users can edit.
--
-- Nothing here deletes data. Server code is unaffected: the backend uses the
-- postgres role, and the Stripe webhook and cron use service_role / postgres.
-- ============================================================================


-- ---- 1. Row-level security on the server-only tables ------------------------
-- No policies: with RLS on and none defined, the API roles get nothing. Some of
-- these tables are created by LangGraph at backend startup rather than by a
-- migration, so each is skipped if it does not exist.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'video_catalog', 'video_rag_nodes',
    'store', 'store_vectors', 'store_migrations', 'vector_migrations',
    'checkpoints', 'checkpoint_blobs', 'checkpoint_writes', 'checkpoint_migrations'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;


-- ---- 2. Credit-granting functions are for the server only -------------------
-- Called by the Stripe webhook (service_role) and the monthly cron (postgres).
REVOKE EXECUTE ON FUNCTION public.credit_points(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.allocate_monthly_points(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.allocate_free_tier_for_user(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.allocate_free_tier_monthly()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_stripe_event(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.credit_points(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_monthly_points(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_free_tier_for_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_free_tier_monthly() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_stripe_event(TEXT, TEXT, JSONB) TO service_role;


-- ---- 3a. user_credits is written only through functions ---------------------
-- The update policy was meant for the overage switch, but with a table-wide
-- UPDATE grant it let a user set any column of their own row, the point
-- balances included. The overage switch already goes through
-- update_overage_settings(), which checks the plan allows it.
DROP POLICY IF EXISTS "Users can update own overage settings" ON public.user_credits;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_credits FROM anon, authenticated;


-- ---- 3b. A refund cannot exceed what was charged ----------------------------
-- refund_points added whatever number it was given. It now refunds at most what
-- the caller was charged for that operation in the last 24 hours, less what has
-- already been refunded. The backend's refund-after-failed-download fits inside
-- that: it refunds the charge it made seconds earlier, under the same operation.
--
-- This stops a balance being inflated. It does not stop a user refunding a
-- charge they really owed; that needs refunds to be issued by the server alone.
CREATE OR REPLACE FUNCTION public.refund_points(
  p_points       INTEGER,
  p_operation    TEXT,
  p_original_txn UUID DEFAULT NULL,
  p_note         TEXT DEFAULT 'Operation failed — full refund'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_balance    INTEGER;
  v_refundable INTEGER;
  v_points     INTEGER;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(p_points, 0) <= 0 THEN
    RETURN;
  END IF;

  -- One refund at a time per user, so two concurrent calls cannot both claim
  -- the same charge.
  PERFORM 1 FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;

  SELECT COALESCE(SUM(-points_delta) FILTER (WHERE txn_type = 'deduction'), 0)
       - COALESCE(SUM(points_delta)  FILTER (WHERE txn_type = 'refund'), 0)
  INTO v_refundable
  FROM public.point_transactions
  WHERE user_id = auth.uid()
    AND operation = p_operation
    AND created_at > now() - interval '24 hours';

  v_points := LEAST(p_points, GREATEST(COALESCE(v_refundable, 0), 0));
  IF v_points <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.user_credits
  SET subscription_points = subscription_points + v_points,
      in_standard_mode    = FALSE   -- coming back from standard mode if applicable
  WHERE user_id = auth.uid()
  RETURNING total_points INTO v_balance;

  INSERT INTO public.point_transactions (
    user_id, txn_type, points_delta, bucket,
    operation, balance_after, refund_of, note
  ) VALUES (
    auth.uid(), 'refund', v_points, 'subscription',
    p_operation, v_balance, p_original_txn, p_note
  );
END;
$function$;


-- ---- 4. is_admin() trusts the account's email, not the profile's ------------
-- profiles.email is a copy a user can change. auth.users is not reachable from
-- the API.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  RETURN COALESCE(lower(v_email) IN ('nilay@zenvi.pro'), FALSE);
END;
$function$;
