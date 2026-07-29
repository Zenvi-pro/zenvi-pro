-- Lock down the access-code helper functions.
--
-- 20260729000001 used `REVOKE ALL ... FROM PUBLIC` to keep its internal helpers
-- private. That is NOT sufficient on Supabase: the project runs
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
-- so every newly created public function receives an *explicit* grant to anon
-- and authenticated. Revoking from PUBLIC does not remove an explicit role
-- grant, so the helpers stayed callable with the public anon key.
--
-- The consequential one was claim_access_code_for_user(p_code, p_user): it takes
-- an arbitrary user id, so anyone holding the (public) anon key could claim a
-- code on behalf of any account and burn the uses of a max_uses-limited code.
-- It must be reachable by service_role only (the Stripe webhook, which has no
-- auth.uid()); everyone else goes through claim_waitlist_token(), which pins
-- p_user to auth.uid().
--
-- Revokes are written per-role and explicitly, since that is the only form that
-- overrides the default-privilege grants.

-- Arbitrary-user claim: service_role only.
REVOKE ALL ON FUNCTION public.claim_access_code_for_user(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_access_code_for_user(TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.claim_access_code_for_user(TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_access_code_for_user(TEXT, UUID) TO service_role;

-- Internal lookup helper: not part of the public API surface.
REVOKE ALL ON FUNCTION public.resolve_shared_access_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_shared_access_code(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_shared_access_code(TEXT) FROM authenticated;

REVOKE ALL ON FUNCTION public.try_cast_uuid(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_cast_uuid(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.try_cast_uuid(TEXT) FROM authenticated;

-- Claiming requires a session. The auth.uid() guard already makes an anon call a
-- no-op, but there is no reason for anon to reach it at all.
REVOKE ALL ON FUNCTION public.claim_waitlist_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_waitlist_token(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_waitlist_token(TEXT) TO authenticated;

-- Caller-scoped (auth.uid()), so authenticated-only.
REVOKE ALL ON FUNCTION public.get_claimed_token_for_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_claimed_token_for_code(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_claimed_token_for_code(TEXT) TO authenticated;

-- Checkout-time tier check; only ever called with a session.
REVOKE ALL ON FUNCTION public.validate_token_for_plan(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_token_for_plan(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.validate_token_for_plan(TEXT, TEXT) TO authenticated;

-- validate_waitlist_token stays reachable by anon on purpose: the landing page
-- checks a code before the visitor has signed up. It returns only validity and
-- an allowed_tier for a code the caller already supplied.
GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(TEXT) TO authenticated;
