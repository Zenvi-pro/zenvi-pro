-- Add columns to track who claimed each waitlist token and when
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS waitlist_used_by_idx ON public.waitlist (used_by);

-- Update validate_waitlist_token to reject tokens already claimed by another user.
-- Works for both anon (auth.uid() = NULL) and authenticated callers:
--   • Unclaimed token  (used_by IS NULL)            → always visible
--   • Token owned by caller (used_by = auth.uid())  → visible (idempotent)
--   • Token owned by someone else                   → invisible (appears invalid)
CREATE OR REPLACE FUNCTION public.validate_waitlist_token(token UUID)
RETURNS TABLE(is_valid BOOLEAN, entry_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE::BOOLEAN AS is_valid,
    w.status       AS entry_status
  FROM public.waitlist w
  WHERE w.access_token = token
    AND (w.used_by IS NULL OR w.used_by = auth.uid())
  LIMIT 1;
END;
$$;

-- Claim a token for the current authenticated user.
-- Returns TRUE on success (first claim or re-claim by same user).
-- Returns FALSE if the token doesn't exist or is already claimed by a different user.
-- Requires an authenticated session; anonymous callers always get FALSE.
CREATE OR REPLACE FUNCTION public.claim_waitlist_token(token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Lock the row; skip if already claimed by someone else
  SELECT id INTO v_row_id
  FROM public.waitlist
  WHERE access_token = token
    AND (used_by IS NULL OR used_by = auth.uid())
  FOR UPDATE SKIP LOCKED;

  IF v_row_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Idempotent: only write if not already claimed by this user
  UPDATE public.waitlist
  SET used_by = auth.uid(),
      used_at  = COALESCE(used_at, now())
  WHERE id = v_row_id
    AND used_by IS DISTINCT FROM auth.uid();

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_waitlist_token(UUID) TO authenticated;

-- Returns TRUE if the current authenticated user has previously claimed any token.
-- Used by the frontend to bypass the access-code modal for returning users.
CREATE OR REPLACE FUNCTION public.get_user_download_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.waitlist
    WHERE used_by = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_download_access() TO authenticated;
