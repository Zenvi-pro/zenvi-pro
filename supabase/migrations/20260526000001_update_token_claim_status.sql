-- Update claim_waitlist_token to explicitly set the status to 'used' when claimed.
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
      used_at  = COALESCE(used_at, now()),
      status   = 'used'
  WHERE id = v_row_id
    AND used_by IS DISTINCT FROM auth.uid();

  RETURN TRUE;
END;
$$;

-- Retroactively mark all waitlist rows that have a used_by association as status = 'used'
UPDATE public.waitlist
SET status = 'used'
WHERE used_by IS NOT NULL;
