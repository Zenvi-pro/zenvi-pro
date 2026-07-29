-- Reusable (multi-use) named access codes, e.g. YC_FALL.
--
-- Existing `waitlist` rows stay single-use UUID invites. A reusable code lives in
-- `access_codes` and mints a per-user `waitlist` row on each claim, so every
-- downstream RPC (get_user_download_access, get_user_claimed_waitlist_token,
-- get_user_waitlist_allowed_tier, lookup_waitlist_token_for_user) and the Stripe
-- edge functions keep working unchanged — each claimer still ends up with their
-- own real UUID access_token.
--
-- The UUID-typed RPC signatures are replaced by TEXT ones so a human-readable
-- code can be submitted through the same PostgREST endpoints. TEXT *replaces*
-- rather than overloads UUID on purpose: PostgREST cannot disambiguate two
-- same-named functions with an identically named argument.

-- ─────────────────────────────────────────────────────────────────────────────
-- access_codes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL,
  allowed_tier TEXT
    CHECK (allowed_tier IS NULL OR allowed_tier IN ('starter', 'pro', 'max', 'creator', 'studio')),
  max_uses     INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  uses         INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMP WITH TIME ZONE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  note         TEXT,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.access_codes IS
  'Shared, reusable access codes. Unlike waitlist rows these are not consumed by a single claimer.';
COMMENT ON COLUMN public.access_codes.code IS
  'Human-readable code. Matched case-insensitively and trim-insensitively (YC_FALL = yc_fall).';
COMMENT ON COLUMN public.access_codes.allowed_tier IS
  'Max paid tier this code unlocks. NULL = any paid tier.';
COMMENT ON COLUMN public.access_codes.max_uses IS
  'Total distinct users that may claim this code. NULL = unlimited.';

-- Case/whitespace-insensitive uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS access_codes_code_lower_idx
  ON public.access_codes (lower(btrim(code)));

-- No policies: reachable only through the SECURITY DEFINER functions below.
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Which shared code minted a given waitlist row, and one claim per user per code.
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS source_code_id UUID
    REFERENCES public.access_codes(id) ON DELETE SET NULL;

-- NULLs are distinct in a unique index, so pre-existing single-use rows
-- (source_code_id IS NULL) never collide here.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_source_code_user_idx
  ON public.waitlist (source_code_id, used_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- helpers
-- ─────────────────────────────────────────────────────────────────────────────

-- NULL instead of an error when the text is not a UUID, so one TEXT-typed RPC
-- can accept both a UUID invite token and a named code.
CREATE OR REPLACE FUNCTION public.try_cast_uuid(p_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN btrim(p_text)::UUID;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.try_cast_uuid(TEXT) FROM PUBLIC;

-- Active + non-expired + not-exhausted shared code, or no row.
CREATE OR REPLACE FUNCTION public.resolve_shared_access_code(p_code TEXT)
RETURNS TABLE(code_id UUID, allowed_tier TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, public.normalize_waitlist_tier(c.allowed_tier)
  FROM public.access_codes c
  WHERE p_code IS NOT NULL
    AND btrim(p_code) <> ''
    AND lower(btrim(c.code)) = lower(btrim(p_code))
    AND c.is_active
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_uses IS NULL OR c.uses < c.max_uses)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_shared_access_code(TEXT) FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────────────────
-- claim
-- ─────────────────────────────────────────────────────────────────────────────

-- Claim a single-use UUID invite OR a shared named code on behalf of p_user.
-- Idempotent: re-claiming by the same user returns TRUE without a second use.
-- Not exposed to anon/authenticated — callers must go through
-- claim_waitlist_token(), which pins p_user to auth.uid().
CREATE OR REPLACE FUNCTION public.claim_access_code_for_user(p_code TEXT, p_user UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid     UUID;
  v_row_id   UUID;
  v_code_id  UUID;
  v_tier     TEXT;
  v_max_uses INTEGER;
  v_uses     INTEGER;
BEGIN
  IF p_user IS NULL OR p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN FALSE;
  END IF;

  -- 1) single-use UUID invite (pre-existing behavior)
  v_uuid := public.try_cast_uuid(p_code);
  IF v_uuid IS NOT NULL THEN
    SELECT w.id INTO v_row_id
    FROM public.waitlist w
    WHERE w.access_token = v_uuid
      AND (w.used_by IS NULL OR w.used_by = p_user)
    FOR UPDATE SKIP LOCKED;

    IF v_row_id IS NOT NULL THEN
      UPDATE public.waitlist
      SET used_by = p_user,
          used_at = COALESCE(used_at, now())
      WHERE id = v_row_id
        AND used_by IS DISTINCT FROM p_user;

      RETURN TRUE;
    END IF;
  END IF;

  -- 2) shared reusable code. Lock the code row so concurrent claimers serialize
  --    and max_uses cannot be overshot.
  SELECT c.id, public.normalize_waitlist_tier(c.allowed_tier), c.max_uses, c.uses
    INTO v_code_id, v_tier, v_max_uses, v_uses
  FROM public.access_codes c
  WHERE lower(btrim(c.code)) = lower(btrim(p_code))
    AND c.is_active
    AND (c.expires_at IS NULL OR c.expires_at > now())
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Already claimed by this user → idempotent success, no extra use burned.
  IF EXISTS (
    SELECT 1 FROM public.waitlist w
    WHERE w.source_code_id = v_code_id
      AND w.used_by = p_user
  ) THEN
    RETURN TRUE;
  END IF;

  IF v_max_uses IS NOT NULL AND v_uses >= v_max_uses THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.waitlist (access_token, allowed_tier, used_by, used_at, source_code_id)
  VALUES (gen_random_uuid(), v_tier, p_user, now(), v_code_id);

  UPDATE public.access_codes
  SET uses = uses + 1
  WHERE id = v_code_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_access_code_for_user(TEXT, UUID) FROM PUBLIC;
-- service_role only, for the Stripe webhook (no auth.uid() in that context).
GRANT EXECUTE ON FUNCTION public.claim_access_code_for_user(TEXT, UUID) TO service_role;

DROP FUNCTION IF EXISTS public.claim_waitlist_token(UUID);

CREATE OR REPLACE FUNCTION public.claim_waitlist_token(token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.claim_access_code_for_user(token, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.claim_waitlist_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_waitlist_token(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- validate
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.validate_waitlist_token(UUID);

CREATE OR REPLACE FUNCTION public.validate_waitlist_token(token TEXT)
RETURNS TABLE(is_valid BOOLEAN, allowed_tier TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid  UUID;
  v_tier  TEXT;
  v_found BOOLEAN := FALSE;
BEGIN
  IF token IS NULL OR btrim(token) = '' THEN
    RETURN;
  END IF;

  v_uuid := public.try_cast_uuid(token);
  IF v_uuid IS NOT NULL THEN
    SELECT public.normalize_waitlist_tier(w.allowed_tier) INTO v_tier
    FROM public.waitlist w
    WHERE w.access_token = v_uuid
      AND (w.used_by IS NULL OR w.used_by = auth.uid())
    LIMIT 1;
    v_found := FOUND;
  END IF;

  IF NOT v_found THEN
    SELECT c.allowed_tier INTO v_tier
    FROM public.resolve_shared_access_code(token) c;
    v_found := FOUND;
  END IF;

  IF v_found THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, v_tier;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_waitlist_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.validate_token_for_plan(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.validate_token_for_plan(token TEXT, target_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed TEXT;
  v_target  TEXT;
BEGIN
  SELECT v.allowed_tier INTO v_allowed
  FROM public.validate_waitlist_token(token) v
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- NULL allowed_tier = unrestricted.
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

REVOKE ALL ON FUNCTION public.validate_token_for_plan(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_token_for_plan(TEXT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- resolve: which minted token belongs to a just-claimed code
-- ─────────────────────────────────────────────────────────────────────────────

-- The UUID access_token of the caller's waitlist row for p_code — the code
-- itself for a claimed single-use invite, or the row minted from a shared code.
-- Lets the client hand a real token to checkout/Stripe instead of a named code.
CREATE OR REPLACE FUNCTION public.get_claimed_token_for_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid    UUID;
  v_token   UUID;
  v_code_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN NULL;
  END IF;

  v_uuid := public.try_cast_uuid(p_code);
  IF v_uuid IS NOT NULL THEN
    SELECT w.access_token INTO v_token
    FROM public.waitlist w
    WHERE w.access_token = v_uuid
      AND w.used_by = auth.uid();

    IF v_token IS NOT NULL THEN
      RETURN v_token;
    END IF;
  END IF;

  SELECT c.id INTO v_code_id
  FROM public.access_codes c
  WHERE lower(btrim(c.code)) = lower(btrim(p_code));

  IF v_code_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT w.access_token INTO v_token
  FROM public.waitlist w
  WHERE w.source_code_id = v_code_id
    AND w.used_by = auth.uid();

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_claimed_token_for_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_claimed_token_for_code(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- rank NULL (unrestricted) highest when a user holds several claimed codes
-- ─────────────────────────────────────────────────────────────────────────────

-- waitlist_tier_order() maps NULL to 0, which is right for tier comparisons but
-- wrong for "pick the caller's best code": a NULL allowed_tier means
-- unrestricted, i.e. better than 'max'. Shared codes like YC_FALL are commonly
-- unrestricted, so without this a user holding both a starter invite and
-- YC_FALL would be resolved down to starter.
CREATE OR REPLACE FUNCTION public.waitlist_tier_rank(p_tier TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.normalize_waitlist_tier(p_tier) IS NULL THEN 4
    ELSE public.waitlist_tier_order(p_tier)
  END;
$$;

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
  ORDER BY public.waitlist_tier_rank(w.allowed_tier) DESC,
           w.used_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_claimed_waitlist_token() TO authenticated;

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
  ORDER BY public.waitlist_tier_rank(w.allowed_tier) DESC,
           w.used_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_waitlist_allowed_tier() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- seed: YC_FALL (case-insensitive, unlimited uses, any paid tier, no expiry)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.access_codes (code, allowed_tier, max_uses, expires_at, is_active, note)
SELECT 'YC_FALL', NULL, NULL, NULL, TRUE, 'YC Fall batch — shared reusable code'
WHERE NOT EXISTS (
  SELECT 1 FROM public.access_codes WHERE lower(btrim(code)) = 'yc_fall'
);
