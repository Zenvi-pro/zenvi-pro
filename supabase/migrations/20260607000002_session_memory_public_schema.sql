-- PostgREST only exposes public (+ graphql_public). Move session memory back to public.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'realtime' AND tablename = 'zenvi_session_memory'
  ) THEN
    ALTER TABLE realtime.zenvi_session_memory SET SCHEMA public;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_session_exchanges(
  query_embedding    vector,
  p_session_id       TEXT,
  match_count        INTEGER DEFAULT 5,
  distance_threshold DOUBLE PRECISION DEFAULT 0.28
)
RETURNS TABLE(
  id             UUID,
  user_msg       TEXT,
  assistant_msg  TEXT,
  distance       DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    m.id,
    m.user_msg,
    m.assistant_msg,
    (m.embedding <=> query_embedding) AS distance
  FROM public.zenvi_session_memory m
  WHERE
    m.session_id = p_session_id
    AND (m.embedding <=> query_embedding) < distance_threshold
  ORDER BY distance ASC
  LIMIT match_count;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.zenvi_session_memory
  TO anon, authenticated, service_role;
