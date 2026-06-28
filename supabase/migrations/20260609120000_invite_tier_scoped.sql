-- Tier-scoped invite: RPC for allowed_tier lookup + email-bound claim + starter invite.

CREATE OR REPLACE FUNCTION public.get_user_waitlist_allowed_tier()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_tier  TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR trim(v_email) = '' THEN
    v_email := auth.jwt() ->> 'email';
  END IF;

  IF v_email IS NOT NULL AND trim(v_email) <> '' THEN
    SELECT public.normalize_waitlist_tier(w.allowed_tier) INTO v_tier
    FROM public.waitlist w
    WHERE lower(trim(w.email)) = lower(trim(v_email))
      AND (w.used_by IS NULL OR w.used_by = auth.uid())
    ORDER BY w.invited_at DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      RETURN v_tier;
    END IF;
  END IF;

  SELECT public.normalize_waitlist_tier(w.allowed_tier) INTO v_tier
  FROM public.waitlist w
  WHERE w.used_by = auth.uid()
  ORDER BY public.waitlist_tier_order(w.allowed_tier) DESC,
           w.used_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_waitlist_allowed_tier() TO authenticated;

-- Reject claims when invite email does not match authenticated user (skip internal placeholders).
CREATE OR REPLACE FUNCTION public.claim_waitlist_token(token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id    UUID;
  v_email     TEXT;
  v_wait_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR trim(v_email) = '' THEN
    v_email := auth.jwt() ->> 'email';
  END IF;

  SELECT w.id, w.email INTO v_row_id, v_wait_email
  FROM public.waitlist w
  WHERE w.access_token = token
    AND (w.used_by IS NULL OR w.used_by = auth.uid())
  FOR UPDATE SKIP LOCKED;

  IF v_row_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_wait_email IS NOT NULL
     AND trim(v_wait_email) <> ''
     AND v_wait_email NOT LIKE '%@zenvi.internal'
     AND v_email IS NOT NULL
     AND trim(v_email) <> ''
     AND lower(trim(v_wait_email)) <> lower(trim(v_email))
  THEN
    RETURN FALSE;
  END IF;

  UPDATE public.waitlist
  SET used_by = auth.uid(),
      used_at  = COALESCE(used_at, now()),
      status   = 'used'
  WHERE id = v_row_id
    AND used_by IS DISTINCT FROM auth.uid();

  RETURN TRUE;
END;
$$;

INSERT INTO public.waitlist (email, access_token, status, invited_at, allowed_tier)
VALUES (
  'noname112000abc@gmail.com',
  gen_random_uuid(),
  'invited',
  now(),
  'starter'
)
ON CONFLICT (email) DO UPDATE SET
  allowed_tier = EXCLUDED.allowed_tier,
  status = 'invited',
  invited_at = COALESCE(public.waitlist.invited_at, now()),
  used_by = CASE
    WHEN public.waitlist.used_by IS NOT NULL THEN public.waitlist.used_by
    ELSE NULL
  END;
