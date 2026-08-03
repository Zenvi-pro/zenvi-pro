-- Multimodal RAG: stamp media_type on catalog (+ index node metadata_ via app writers).

ALTER TABLE public.video_catalog
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'video';

UPDATE public.video_catalog
SET media_type = 'video'
WHERE media_type IS NULL OR media_type = '';

CREATE INDEX IF NOT EXISTS idx_video_catalog_media_type
  ON public.video_catalog(media_type);

CREATE INDEX IF NOT EXISTS idx_video_rag_nodes_meta_media_type
  ON public.video_rag_nodes ((metadata_->>'media_type'));
