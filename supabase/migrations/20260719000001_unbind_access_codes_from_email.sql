-- Convert waitlist into an email-independent single-use access-code pool.
-- Availability is determined only by used_by / used_at.

-- Drop public insert policy so clients cannot mint codes.
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

-- Remove email-binding and invitation-stage columns (preserve tokens + claims).
ALTER TABLE public.waitlist
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS invited_at;

-- validate_waitlist_token: validity + allowed_tier only (no status).
DROP FUNCTION IF EXISTS public.validate_waitlist_token(UUID);

CREATE OR REPLACE FUNCTION public.validate_waitlist_token(token UUID)
RETURNS TABLE(is_valid BOOLEAN, allowed_tier TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE::BOOLEAN AS is_valid,
    public.normalize_waitlist_tier(w.allowed_tier) AS allowed_tier
  FROM public.waitlist w
  WHERE w.access_token = token
    AND (w.used_by IS NULL OR w.used_by = auth.uid())
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(UUID) TO authenticated;

-- claim_waitlist_token: any unused code, no email check.
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

  SELECT w.id INTO v_row_id
  FROM public.waitlist w
  WHERE w.access_token = token
    AND (w.used_by IS NULL OR w.used_by = auth.uid())
  FOR UPDATE SKIP LOCKED;

  IF v_row_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.waitlist
  SET used_by = auth.uid(),
      used_at = COALESCE(used_at, now())
  WHERE id = v_row_id
    AND used_by IS DISTINCT FROM auth.uid();

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_waitlist_token(UUID) TO authenticated;

-- get_user_waitlist_allowed_tier: claimed tokens only (no email lookup).
CREATE OR REPLACE FUNCTION public.get_user_waitlist_allowed_tier()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
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

-- lookup_waitlist_token_for_user already delegates to claimed-token helper;
-- keep that behavior explicit.
CREATE OR REPLACE FUNCTION public.lookup_waitlist_token_for_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_claimed_waitlist_token();
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_waitlist_token_for_user() TO authenticated;
