-- Chunked session RAG memory: content/role/turn metadata + match_session_chunks RPC.
-- Keeps legacy user_msg/assistant_msg columns for backward compatibility.

ALTER TABLE IF EXISTS public.zenvi_session_memory
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'exchange',
  ADD COLUMN IF NOT EXISTS turn_id TEXT,
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Backfill content from legacy columns where empty
UPDATE public.zenvi_session_memory
SET content = COALESCE(
  NULLIF(content, ''),
  NULLIF(TRIM(BOTH FROM CONCAT_WS(E'\n', NULLIF(user_msg, ''), NULLIF(assistant_msg, ''))), '')
)
WHERE content IS NULL OR content = '';

-- Allow empty legacy columns for new chunk rows
ALTER TABLE IF EXISTS public.zenvi_session_memory
  ALTER COLUMN user_msg DROP NOT NULL,
  ALTER COLUMN assistant_msg DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.match_session_chunks(
  query_embedding    vector,
  p_session_id       TEXT,
  match_count        INTEGER DEFAULT 12,
  distance_threshold DOUBLE PRECISION DEFAULT 0.35
)
RETURNS TABLE(
  id             UUID,
  content        TEXT,
  role           TEXT,
  turn_id        TEXT,
  chunk_index    INTEGER,
  distance       DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    m.id,
    COALESCE(NULLIF(m.content, ''), CONCAT_WS(E'\n', m.user_msg, m.assistant_msg)) AS content,
    COALESCE(m.role, 'exchange') AS role,
    m.turn_id,
    COALESCE(m.chunk_index, 0) AS chunk_index,
    (m.embedding <=> query_embedding) AS distance
  FROM public.zenvi_session_memory m
  WHERE
    m.session_id = p_session_id
    AND (m.embedding <=> query_embedding) < distance_threshold
  ORDER BY distance ASC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_session_chunks(
  vector, TEXT, INTEGER, DOUBLE PRECISION
) TO anon, authenticated, service_role;
