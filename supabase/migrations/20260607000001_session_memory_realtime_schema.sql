-- Move zenvi_session_memory from public → realtime schema.
-- Backend reads/writes via PostgREST schema("realtime").
--
-- NOTE: realtime.subscription is Supabase Realtime internal plumbing (websocket
-- channel registry). It is NOT public.subscriptions (Stripe billing). Do not drop.

CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'zenvi_session_memory'
  ) THEN
    ALTER TABLE public.zenvi_session_memory SET SCHEMA realtime;
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'realtime' AND tablename = 'zenvi_session_memory'
  ) THEN
    CREATE TABLE realtime.zenvi_session_memory (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id    TEXT NOT NULL,
      user_msg      TEXT NOT NULL,
      assistant_msg TEXT NOT NULL,
      embedding     vector(1536) NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX idx_zenvi_session_memory_session_id
      ON realtime.zenvi_session_memory (session_id);

    CREATE INDEX idx_zenvi_session_memory_embedding
      ON realtime.zenvi_session_memory
      USING hnsw (embedding vector_cosine_ops);
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
SET search_path = realtime, public
AS $$
  SELECT
    m.id,
    m.user_msg,
    m.assistant_msg,
    (m.embedding <=> query_embedding) AS distance
  FROM realtime.zenvi_session_memory m
  WHERE
    m.session_id = p_session_id
    AND (m.embedding <=> query_embedding) < distance_threshold
  ORDER BY distance ASC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_session_exchanges(
  vector, TEXT, INTEGER, DOUBLE PRECISION
) TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON realtime.zenvi_session_memory
  TO anon, authenticated, service_role;
