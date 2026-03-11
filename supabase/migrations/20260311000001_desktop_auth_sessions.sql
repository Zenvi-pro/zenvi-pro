-- desktop_auth_sessions: temporary bridge for the desktop app OAuth flow.
-- The flow:
--   1. Desktop app generates a state UUID and opens browser: /login?state=<uuid>
--   2. User signs in on the website (Supabase Auth)
--   3. Website calls complete_desktop_auth_session() with the JWT
--   4. Desktop app polls poll_desktop_auth_session() every 2s until it gets the token
--   5. Session is marked used and expires after 10 minutes

CREATE TABLE IF NOT EXISTS public.desktop_auth_sessions (
  state        UUID PRIMARY KEY,
  user_id      UUID,
  access_token TEXT,
  refresh_token TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  used         BOOLEAN NOT NULL DEFAULT FALSE
);

-- No direct RLS policies — all access is through SECURITY DEFINER functions below.
ALTER TABLE public.desktop_auth_sessions ENABLE ROW LEVEL SECURITY;

-- ── complete_desktop_auth_session ──────────────────────────────────────────
-- Called by the website after the user authenticates (requires authenticated role).
CREATE OR REPLACE FUNCTION public.complete_desktop_auth_session(
  session_state  UUID,
  p_access_token TEXT,
  p_refresh_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO desktop_auth_sessions (state, user_id, access_token, refresh_token)
  VALUES (session_state, auth.uid(), p_access_token, p_refresh_token)
  ON CONFLICT (state) DO NOTHING;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_desktop_auth_session(UUID, TEXT, TEXT)
  TO authenticated;

-- ── poll_desktop_auth_session ──────────────────────────────────────────────
-- Called by the desktop app (anon key) to check if auth has completed.
-- Returns a single-use token then marks the session as consumed.
CREATE OR REPLACE FUNCTION public.poll_desktop_auth_session(session_state UUID)
RETURNS TABLE(authenticated BOOLEAN, access_token TEXT, refresh_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess RECORD;
BEGIN
  SELECT *
  INTO sess
  FROM desktop_auth_sessions
  WHERE state = session_state
    AND expires_at > now()
    AND used = FALSE;

  IF NOT FOUND OR sess.access_token IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Consume the session (single-use)
  UPDATE desktop_auth_sessions SET used = TRUE WHERE state = session_state;

  RETURN QUERY SELECT TRUE::BOOLEAN, sess.access_token, sess.refresh_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.poll_desktop_auth_session(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.poll_desktop_auth_session(UUID) TO authenticated;

-- ── Automatic cleanup ──────────────────────────────────────────────────────
-- Run via pg_cron or a scheduled edge function in production.
-- DELETE FROM public.desktop_auth_sessions WHERE expires_at < now();
