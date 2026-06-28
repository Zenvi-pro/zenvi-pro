-- Per-invite plan tier + claimed-only token resolution for checkout gate.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS allowed_tier TEXT
    CHECK (allowed_tier IS NULL OR allowed_tier IN ('starter', 'pro', 'max', 'creator', 'studio'));

COMMENT ON COLUMN public.waitlist.allowed_tier IS
  'Max paid tier this invite unlocks. NULL = any paid tier.';

-- Normalize legacy tier names to canonical order keys.
CREATE OR REPLACE FUNCTION public.normalize_waitlist_tier(p_tier TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_tier IS NULL OR trim(p_tier) = '' THEN NULL
    WHEN lower(trim(p_tier)) IN ('creator', 'starter') THEN 'starter'
    WHEN lower(trim(p_tier)) IN ('studio', 'max') THEN 'max'
    WHEN lower(trim(p_tier)) = 'pro' THEN 'pro'
    ELSE lower(trim(p_tier))
  END;
$$;

CREATE OR REPLACE FUNCTION public.waitlist_tier_order(p_tier TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE public.normalize_waitlist_tier(p_tier)
    WHEN 'starter' THEN 1
    WHEN 'pro'    THEN 2
    WHEN 'max'    THEN 3
    ELSE 0
  END;
$$;

-- Extend validate_waitlist_token to return allowed_tier.
DROP FUNCTION IF EXISTS public.validate_waitlist_token(UUID);

CREATE OR REPLACE FUNCTION public.validate_waitlist_token(token UUID)
RETURNS TABLE(is_valid BOOLEAN, entry_status TEXT, allowed_tier TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE::BOOLEAN AS is_valid,
    w.status       AS entry_status,
    public.normalize_waitlist_tier(w.allowed_tier) AS allowed_tier
  FROM public.waitlist w
  WHERE w.access_token = token
    AND (w.used_by IS NULL OR w.used_by = auth.uid())
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(UUID) TO authenticated;

-- Returns token only when already claimed by the current user (highest allowed_tier wins).
CREATE OR REPLACE FUNCTION public.get_user_claimed_waitlist_token()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT w.access_token INTO v_token
  FROM public.waitlist w
  WHERE w.used_by = auth.uid()
  ORDER BY public.waitlist_tier_order(w.allowed_tier) DESC,
           w.used_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_claimed_waitlist_token() TO authenticated;

-- Validate token is usable for a target checkout tier.
CREATE OR REPLACE FUNCTION public.validate_token_for_plan(token UUID, target_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed TEXT;
  v_target  TEXT;
BEGIN
  SELECT public.normalize_waitlist_tier(w.allowed_tier) INTO v_allowed
  FROM public.waitlist w
  WHERE w.access_token = token
    AND (w.used_by IS NULL OR w.used_by = auth.uid())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_allowed IS NULL THEN
    RETURN TRUE;
  END IF;

  v_target := public.normalize_waitlist_tier(target_tier);
  IF v_target IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.waitlist_tier_order(v_target) <= public.waitlist_tier_order(v_allowed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_token_for_plan(UUID, TEXT) TO authenticated;

-- Restrict email lookup to claimed tokens only (safe fallback for legacy callers).
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
