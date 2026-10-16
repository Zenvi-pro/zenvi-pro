-- Run the sync-model-pricing edge function once a day (03:17 UTC).
--
-- The function only accepts the service-role key. Store it once in Vault as
-- `service_role_key` (Dashboard -> Project Settings -> Vault, or
-- `select vault.create_secret('<key>', 'service_role_key');`). Until then the
-- call gets a 401 and nothing changes.
--
-- cron.schedule replaces a job with the same name, so re-running is safe.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'zenvi-sync-model-pricing-daily',
  '17 3 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://xktarhzbrdnxkaovtdxj.supabase.co/functions/v1/sync-model-pricing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
