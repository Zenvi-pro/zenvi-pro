-- Desktop sign-in hand-off: answer truthfully, and don't keep tokens around.
--
-- complete_desktop_auth_session returned TRUE even when its INSERT did nothing
-- (the state was already completed, or by someone else), so the website could
-- report a sign-in the desktop app never received. It now returns TRUE only
-- when the row holds this user's sign-in: the one just written, or an earlier
-- completion by the same user (a second click on "Continue").
--
-- poll_desktop_auth_session now clears the tokens from the row as it hands
-- them over: the row is single-use, and nothing needs them afterwards.
-- Shipped desktop apps see no difference (same signatures, same results).

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

  IF FOUND THEN
    RETURN TRUE;
  END IF;

  -- Already completed: fine if it was this user (and not yet expired unless
  -- the app already collected it).
  RETURN EXISTS (
    SELECT 1
    FROM desktop_auth_sessions
    WHERE state = session_state
      AND user_id = auth.uid()
      AND (used OR expires_at > now())
  );
END;
$$;

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

  -- Consume the session (single-use) and forget its tokens.
  UPDATE desktop_auth_sessions
  SET used = TRUE, access_token = NULL, refresh_token = NULL
  WHERE state = session_state;

  RETURN QUERY SELECT TRUE::BOOLEAN, sess.access_token, sess.refresh_token;
END;
$$;
