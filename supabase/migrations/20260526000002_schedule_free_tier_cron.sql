-- ─────────────────────────────────────────────────────────────────────────────
-- Schedule allocate_free_tier_monthly() to fire on the 1st of every month
-- ─────────────────────────────────────────────────────────────────────────────
--
-- This migration enables pg_cron + pg_net (already available on every
-- Supabase project) and schedules a recurring job that:
--   1. Iterates auth.users
--   2. Skips anyone with an active/trialing subscription
--   3. Inserts 100 cr into user_credits.subscription_points for everyone
--      else, idempotent per (user, calendar month) via point_transactions
--      ledger check inside allocate_free_tier_monthly()
--
-- Why now: the RPC was added in 20260525000001_billing_v2_tiers_and_categories.sql
-- but never scheduled. Without this, /signup creates user_credits with 0 cr
-- and the free-tier trial we advertise on /pricing doesn't actually exist.
--
-- Schedule: 00:05 UTC on day 1 of each month — gives Stripe webhooks an
-- hour of margin if invoice.payment_succeeded for paid plans is delayed.
--
-- Idempotent migration: re-running this file will unschedule + reschedule
-- the same job under the same name without creating duplicates.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any previous version of this job (idempotency).
DO $$
BEGIN
  PERFORM cron.unschedule('zenvi-free-tier-monthly-allocation')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'zenvi-free-tier-monthly-allocation'
  );
EXCEPTION WHEN OTHERS THEN
  -- cron.unschedule raises if the job doesn't exist; the WHERE EXISTS
  -- above prevents that on the happy path but keep this guard for
  -- pg_cron versions that ignore the WHERE.
  NULL;
END $$;

-- Schedule: 00:05 UTC on day 1 of each month.
-- Cron syntax: minute hour day_of_month month day_of_week
SELECT cron.schedule(
  'zenvi-free-tier-monthly-allocation',
  '5 0 1 * *',
  $cron$SELECT public.allocate_free_tier_monthly();$cron$
);

-- One-time backfill: run it now so users created before this migration
-- get this month's 100 cr immediately instead of waiting for the next
-- calendar month boundary.
SELECT public.allocate_free_tier_monthly() AS users_allocated_on_backfill;
