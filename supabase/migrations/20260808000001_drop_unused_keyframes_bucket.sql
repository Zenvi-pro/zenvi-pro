-- Drop unused keyframes bucket policies + bucket.
-- Prefer Storage API for object/bucket deletion; this migration cleans policies
-- and removes the bucket row when allow_delete_query is enabled (Supabase Storage API path).
-- Live cleanup for Zenvi Production was performed via Storage API (empty + deleteBucket).

DROP POLICY IF EXISTS keyframes_select_own ON storage.objects;
DROP POLICY IF EXISTS keyframes_insert_own ON storage.objects;
DROP POLICY IF EXISTS keyframes_update_own ON storage.objects;
DROP POLICY IF EXISTS keyframes_delete_own ON storage.objects;

DO $$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE bucket_id = 'keyframes';
  DELETE FROM storage.buckets WHERE id = 'keyframes';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'keyframes bucket delete skipped (use Storage API): %', SQLERRM;
END $$;
