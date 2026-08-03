-- Gemini video RAG: catalog (orientation) + pgvector nodes (summary/clip).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.video_catalog (
  video_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  filename TEXT,
  short_summary TEXT NOT NULL DEFAULT '',
  duration_sec DOUBLE PRECISION,
  provider TEXT NOT NULL DEFAULT 'gemini-flash',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_catalog_project
  ON public.video_catalog(project_id);

CREATE TABLE IF NOT EXISTS public.video_rag_nodes (
  id BIGSERIAL PRIMARY KEY,
  node_id TEXT UNIQUE NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  metadata_ JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_video_rag_nodes_embedding
  ON public.video_rag_nodes
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_video_rag_nodes_meta_video
  ON public.video_rag_nodes ((metadata_->>'video_id'));

CREATE INDEX IF NOT EXISTS idx_video_rag_nodes_meta_type
  ON public.video_rag_nodes ((metadata_->>'node_type'));

CREATE INDEX IF NOT EXISTS idx_video_rag_nodes_meta_project
  ON public.video_rag_nodes ((metadata_->>'project_id'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_catalog TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_rag_nodes TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.video_rag_nodes_id_seq TO anon, authenticated, service_role;
