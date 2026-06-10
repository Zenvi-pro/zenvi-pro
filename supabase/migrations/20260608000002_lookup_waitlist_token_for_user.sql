-- Return the waitlist access_token for the authenticated user's email, if one exists.
-- Tokens are linked to waitlist.email at invite time; claim still happens via used_by on checkout.
CREATE OR REPLACE FUNCTION public.lookup_waitlist_token_for_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_token UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email = '' THEN
    v_email := auth.jwt() ->> 'email';
  END IF;

  SELECT w.access_token INTO v_token
  FROM public.waitlist w
  WHERE lower(trim(w.email)) = lower(trim(v_email))
    AND w.status IN ('invited', 'used', 'pending')
    AND (w.used_by IS NULL OR w.used_by = auth.uid())
  ORDER BY w.invited_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_waitlist_token_for_user() TO authenticated;
