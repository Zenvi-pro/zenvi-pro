-- ============================================================================
-- Drop tables nothing reads or writes
-- ============================================================================
-- Checked on 2026-10-01 against zenvi-backend, zenvi-core, zenvi-pro (src,
-- edge functions, api) and every function, view, trigger and foreign key in
-- the database.
--
--   zenvi_session_memory   10 rows. The first session-memory store. The backend
--                          moved to LangGraph's PostgresStore (public.store /
--                          store_vectors); core/memory says so in its docstrings.
--                          Only match_session_chunks / match_session_exchanges
--                          touch it, and nothing calls either.
--
--   video_shots            8 rows. Shot-level index from 2026-07; indexing now
--                          writes video_catalog / video_rag_nodes. Only
--                          match_video_shots touches it, and nothing calls it.
--
--   llm_model_tiers        50 rows. compute_llm_credits was its only reader and
--                          now prices from api_pricing alone (previous migration).
--
-- Not dropped, though they look quiet -- each still has a live reader or writer:
--   api_usage (backend usage flush), usage_anomalies (admin billing page),
--   hyperframes_routing_events (hyperframes job store), checkpoints* (LangChain
--   harness, still selectable), access_codes / waitlist / bonus_* /
--   desktop_auth_sessions / stripe_webhook_events (RPCs and edge functions).
-- ============================================================================

DROP FUNCTION IF EXISTS public.match_session_chunks(vector, text, integer, double precision);
DROP FUNCTION IF EXISTS public.match_session_exchanges(vector, text, integer, double precision);
DROP TABLE IF EXISTS public.zenvi_session_memory;

DROP FUNCTION IF EXISTS public.match_video_shots(vector, uuid, text, integer, double precision);
DROP TABLE IF EXISTS public.video_shots;

DROP TABLE IF EXISTS public.llm_model_tiers;
