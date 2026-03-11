-- Add access_token and status to waitlist for token-gated downloads
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS access_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;

-- Ensure access_token is unique
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_access_token_idx
  ON public.waitlist (access_token);

-- Postgres function for secure token validation (avoids exposing full table)
-- The anon role can call this to check a token without reading other rows
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
    w.status AS entry_status
  FROM public.waitlist w
  WHERE w.access_token = token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_waitlist_token(UUID) TO authenticated;
