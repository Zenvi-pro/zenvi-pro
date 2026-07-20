-- Video shot understanding: captions + SigLIP 768-dim embeddings for semantic search.

CREATE EXTENSION IF NOT EXISTS vector;

-- Storage bucket for keyframe JPEGs (uploaded from desktop client).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'keyframes',
  'keyframes',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.video_shots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id        TEXT,
  video_id          TEXT NOT NULL,
  clip_id           TEXT,
  shot_id           TEXT NOT NULL,
  shot_index        INTEGER NOT NULL,
  start_sec         DOUBLE PRECISION NOT NULL,
  end_sec           DOUBLE PRECISION NOT NULL,
  keyframe_captions JSONB NOT NULL DEFAULT '[]',
  derived_tags      TEXT[] NOT NULL DEFAULT '{}',
  pooled_caption    TEXT,
  embedding         vector(768) NOT NULL,
  embedding_model   TEXT NOT NULL DEFAULT 'siglip-base-patch16-224',
  caption_model     TEXT NOT NULL DEFAULT 'fastvlm-0.5b-onnx',
  analyzed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT video_shots_time_check CHECK (end_sec > start_sec),
  CONSTRAINT video_shots_unique_shot UNIQUE (user_id, video_id, shot_id)
);

CREATE INDEX IF NOT EXISTS idx_video_shots_user_video
  ON public.video_shots (user_id, video_id);

CREATE INDEX IF NOT EXISTS idx_video_shots_tags
  ON public.video_shots USING GIN (derived_tags);

CREATE INDEX IF NOT EXISTS idx_video_shots_captions
  ON public.video_shots USING GIN (keyframe_captions jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_video_shots_embedding
  ON public.video_shots USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.video_shots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS video_shots_owner ON public.video_shots;
CREATE POLICY video_shots_owner ON public.video_shots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.match_video_shots(
  query_embedding    vector(768),
  p_user_id          UUID,
  p_video_id         TEXT DEFAULT NULL,
  match_count        INTEGER DEFAULT 10,
  distance_threshold DOUBLE PRECISION DEFAULT 0.35
)
RETURNS TABLE(
  id              UUID,
  video_id        TEXT,
  shot_id         TEXT,
  shot_index      INTEGER,
  start_sec       DOUBLE PRECISION,
  end_sec         DOUBLE PRECISION,
  pooled_caption  TEXT,
  derived_tags    TEXT[],
  distance        DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    s.id,
    s.video_id,
    s.shot_id,
    s.shot_index,
    s.start_sec,
    s.end_sec,
    s.pooled_caption,
    s.derived_tags,
    (s.embedding <=> query_embedding) AS distance
  FROM public.video_shots s
  WHERE
    s.user_id = p_user_id
    AND (p_video_id IS NULL OR s.video_id = p_video_id)
    AND (s.embedding <=> query_embedding) < distance_threshold
  ORDER BY distance ASC
  LIMIT match_count;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_shots TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_video_shots TO authenticated, service_role;

-- RLS for keyframes bucket: users can manage their own prefix.
DROP POLICY IF EXISTS keyframes_select_own ON storage.objects;
CREATE POLICY keyframes_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'keyframes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS keyframes_insert_own ON storage.objects;
CREATE POLICY keyframes_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'keyframes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS keyframes_update_own ON storage.objects;
CREATE POLICY keyframes_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'keyframes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS keyframes_delete_own ON storage.objects;
CREATE POLICY keyframes_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'keyframes' AND (storage.foldername(name))[1] = auth.uid()::text);
