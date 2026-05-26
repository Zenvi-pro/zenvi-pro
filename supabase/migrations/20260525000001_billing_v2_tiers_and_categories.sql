-- ─────────────────────────────────────────────────────────────────────────────
-- Billing v2 — final tier structure + extended metering
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Adds:
--   • Free / Starter / Max tier rows (and updates Pro to new $49 pricing)
--   • api_pricing rows for every previously-unmetered paid provider
--     (TwelveLabs indexing/search, Perplexity, Gemini vision, Kling variants)
--   • stripe_webhook_events  — idempotency log for the Stripe webhook
--   • usage_anomalies        — spending-anomaly detection ledger
--   • category column on api_usage and point_transactions (backfilled)
--   • llm_model_tiers        — mapping models → billing band + credit formula
--   • compute_llm_credits()  — server-authoritative credit calculation
--   • check_credits_allowed() — points-based pre-flight gate
--   • get_category_breakdown() — dashboard LLM/Video/Indexing split
--   • allocate_free_tier_monthly() — service-role cron for the 100-pt trial
--   • record_stripe_event() — service-role helper for webhook idempotency
--
-- Migrates:
--   • subscriptions.tier  creator → starter, studio → max  (legacy rows kept
--     in tier_config / tier_limits for backwards compatibility)
--
-- Safety:
--   • All additive (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / ON CONFLICT)
--   • No DROP / no TRUNCATE / no destructive type changes
--   • Existing function signatures untouched (new RPCs are net-new names)
--   • Nilay's lifetime grant preserved (lifetime tier_config row untouched)
-- ─────────────────────────────────────────────────────────────────────────────

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. tier_config — add free / starter / max; update pro
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.tier_config (
  tier,
  monthly_points, annual_monthly_points,
  max_indexing_minutes_per_month, max_concurrent_generations, max_daily_generations,
  max_export_resolution,
  rollover_percentage, rollover_cap_points,
  overage_allowed, overage_markup_percentage, overage_monthly_cap_usd,
  seats, max_accumulated_points,
  description
) VALUES
  -- Free: $0/mo, 100 pt trial
  ('free',
   100, 100,
   6, 1, 5,
   '1080p',
   0.00, 0,
   FALSE, 0.00, 0.00,
   1, 0,
   'Free trial — 100 pts/mo, local Ollama + limited cloud'),

  -- Starter: $29/mo or $25/mo annual ($300/yr, 14% off)
  ('starter',
   2500, 3000,
   60, 1, 30,
   '1080p',
   0.20, 500,
   TRUE, 0.50, 50.00,
   1, 0,
   'Starter plan — $29/mo, 1 seat'),

  -- Max: $199/mo or $149/mo annual ($1,788/yr, 25% off)
  ('max',
   25000, 30000,
   600, 3, 300,
   '4k',
   0.30, 7500,
   TRUE, 0.20, 500.00,
   8, 0,
   'Max plan — $199/mo, 8 pooled seats')
ON CONFLICT (tier) DO UPDATE SET
  monthly_points                 = EXCLUDED.monthly_points,
  annual_monthly_points          = EXCLUDED.annual_monthly_points,
  max_indexing_minutes_per_month = EXCLUDED.max_indexing_minutes_per_month,
  max_concurrent_generations     = EXCLUDED.max_concurrent_generations,
  max_daily_generations          = EXCLUDED.max_daily_generations,
  max_export_resolution          = EXCLUDED.max_export_resolution,
  rollover_percentage            = EXCLUDED.rollover_percentage,
  rollover_cap_points            = EXCLUDED.rollover_cap_points,
  overage_allowed                = EXCLUDED.overage_allowed,
  overage_markup_percentage      = EXCLUDED.overage_markup_percentage,
  overage_monthly_cap_usd        = EXCLUDED.overage_monthly_cap_usd,
  seats                          = EXCLUDED.seats,
  max_accumulated_points         = EXCLUDED.max_accumulated_points,
  description                    = EXCLUDED.description,
  updated_at                     = now();

-- Update Pro to new $49/mo semantics (5,500 pts/mo, 3 seats, 1.3× overage)
UPDATE public.tier_config
SET
  monthly_points                 = 5500,
  annual_monthly_points          = 6600,
  max_indexing_minutes_per_month = 250,
  max_concurrent_generations     = 2,
  max_daily_generations          = 100,
  max_export_resolution          = '4k',
  rollover_percentage            = 0.25,
  rollover_cap_points            = 1375,
  overage_allowed                = TRUE,
  overage_markup_percentage      = 0.30,
  overage_monthly_cap_usd        = 150.00,
  seats                          = 3,
  description                    = 'Pro plan — $49/mo, 3 pooled seats',
  updated_at                     = now()
WHERE tier = 'pro';


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. tier_limits — add free / starter / max; keep existing creator/pro/studio
-- ═════════════════════════════════════════════════════════════════════════════
--
-- tier_limits is the legacy USD-based ceiling table consulted by the existing
-- check_usage_allowed RPC. We only ADD rows here — we do NOT lower the limit
-- on the pre-existing 'pro' row (would shrink existing subscribers' headroom
-- mid-cycle). The new points-based check_credits_allowed() is the authoritative
-- gate going forward.
INSERT INTO public.tier_limits (tier, monthly_usd_limit, description) VALUES
  ('free',    1.00,   'Free tier — 100 pts/mo trial'),
  ('starter', 30.00,  'Starter plan — $29/mo'),
  ('max',     220.00, 'Max plan — $199/mo')
ON CONFLICT (tier) DO UPDATE SET
  monthly_usd_limit = EXCLUDED.monthly_usd_limit,
  description       = EXCLUDED.description;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Migrate existing subscriptions to new tier names
-- ═════════════════════════════════════════════════════════════════════════════
--
-- creator → starter, studio → max. Idempotent. Legacy rows in tier_config /
-- tier_limits remain so old reads against creator/studio still resolve.
UPDATE public.subscriptions SET tier = 'starter' WHERE tier = 'creator';
UPDATE public.subscriptions SET tier = 'max'     WHERE tier = 'studio';


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. api_pricing — every paid provider, including previously-unmetered ones
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The existing calculate_api_cost() picks the longest matching model_pattern,
-- so adding specific Kling variants below correctly overrides the generic
-- 'runware/%' wildcard for those exact models without breaking the wildcard.

INSERT INTO public.api_pricing (provider, model_pattern, input_cost_per_million, output_cost_per_million, flat_cost_per_unit) VALUES
  -- ── Runware (Kling) — exact variants ────────────────────────────────────
  ('runware',    'kling-1.6-std%',           0,     0,     0.350000),
  ('runware',    'kling-1.6-pro%',           0,     0,     0.550000),
  ('runware',    'kling-2.0%',               0,     0,     0.850000),
  ('runware',    'morph%',                   0,     0,     0.350000),

  -- ── TwelveLabs ──────────────────────────────────────────────────────────
  -- Indexing: units = minutes. Marengo 2.6/2.7 averages ~$0.09/min.
  ('twelvelabs', 'marengo-index%',           0,     0,     0.090000),
  -- Search: per query, included in indexing fees but we bill a small credit
  -- charge for app accounting (units = 1 per query).
  ('twelvelabs', 'marengo-search%',          0,     0,     0.002000),
  ('twelvelabs', '%',                        0,     0,     0.090000),

  -- ── Perplexity Sonar (research) ─────────────────────────────────────────
  ('perplexity', 'sonar-pro%',               0,     0,     0.008000),
  ('perplexity', 'sonar%',                   0,     0,     0.005000),
  ('perplexity', '%',                        0,     0,     0.005000),

  -- ── Google Gemini vision (video tagging, media analysis) ───────────────
  -- Per-image / per-frame flat rate (avg cost of vision-only Gemini call)
  ('google',     'gemini-vision%',           0,     0,     0.002000),
  ('google',     'gemini%-vision%',          0,     0,     0.002000)
ON CONFLICT (provider, model_pattern) DO UPDATE SET
  input_cost_per_million  = EXCLUDED.input_cost_per_million,
  output_cost_per_million = EXCLUDED.output_cost_per_million,
  flat_cost_per_unit      = EXCLUDED.flat_cost_per_unit;

-- Add newer LLM models that may not be in the seed
INSERT INTO public.api_pricing (provider, model_pattern, input_cost_per_million, output_cost_per_million) VALUES
  ('openai',     'gpt-4.1%',                 2.00,  8.00),
  ('openai',     'o1-mini%',                 3.00, 12.00),
  ('openai',     'o1%',                     15.00, 60.00),
  ('openai',     'o3%',                     30.00, 120.00),
  ('google',     'gemini-2.0-flash%',        0.075, 0.30),
  ('google',     'gemini-2.5-pro%',          1.25,  5.00),
  ('google',     'gemini-2.5-flash%',        0.075, 0.30)
ON CONFLICT (provider, model_pattern) DO UPDATE SET
  input_cost_per_million  = EXCLUDED.input_cost_per_million,
  output_cost_per_million = EXCLUDED.output_cost_per_million;


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. stripe_webhook_events — idempotency log
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  error           TEXT
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No SELECT policy — service role only (anon/auth cannot read raw webhook payloads)

CREATE INDEX IF NOT EXISTS stripe_webhook_events_type_processed_idx
  ON public.stripe_webhook_events (event_type, processed_at DESC);

-- record_stripe_event: insert returns true; conflict (duplicate event) returns false.
CREATE OR REPLACE FUNCTION public.record_stripe_event(
  p_event_id   TEXT,
  p_event_type TEXT,
  p_payload    JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  INSERT INTO public.stripe_webhook_events (stripe_event_id, event_type, payload)
  VALUES (p_event_id, p_event_type, p_payload)
  ON CONFLICT (stripe_event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_stripe_event(TEXT, TEXT, JSONB) TO service_role;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. usage_anomalies — spend-anomaly detection ledger
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.usage_anomalies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  category              TEXT,
  spend_today_credits   INTEGER NOT NULL,
  baseline_avg_credits  NUMERIC(10, 2) NOT NULL,
  multiplier            NUMERIC(6, 2) NOT NULL,
  action_taken          TEXT,
  resolved_at           TIMESTAMPTZ,
  note                  TEXT
);

ALTER TABLE public.usage_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own anomalies"
  ON public.usage_anomalies FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS usage_anomalies_user_detected_idx
  ON public.usage_anomalies (user_id, detected_at DESC);


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. category column on both ledgers (backfilled from operation)
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.api_usage          ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.point_transactions ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill api_usage.category from operation (NULL → derived)
UPDATE public.api_usage
SET category = CASE
  WHEN operation IN ('chat', 'llm', 'assistant', 'completion')                          THEN 'llm'
  WHEN operation IN ('video_generation', 'morph_generation', 'video', 'generation')      THEN 'video'
  WHEN operation IN ('research_query', 'research_plan', 'research')                      THEN 'research'
  WHEN operation IN ('indexing', 'index_video', 'reindex_video', 'indexing_per_minute')  THEN 'indexing'
  WHEN operation IN ('search', 'search_query', 'clip_search')                            THEN 'search'
  WHEN operation IN ('tag_video', 'retag_video', 'vision', 'media_analysis')             THEN 'vision'
  WHEN operation IN ('stock_add', 'face_profile', 'product_demo')                        THEN 'other'
  ELSE 'other'
END
WHERE category IS NULL;

-- Backfill point_transactions.category from operation + txn_type
UPDATE public.point_transactions
SET category = CASE
  WHEN txn_type  IN ('allocation', 'rollover', 'bonus', 'topup')                         THEN 'system'
  WHEN txn_type  = 'refund'                                                              THEN 'refund'
  WHEN txn_type  = 'overage_charge'                                                      THEN 'overage'
  WHEN operation IN ('chat', 'llm', 'assistant', 'completion')                           THEN 'llm'
  WHEN operation IN ('video_generation', 'morph_generation', 'video', 'generation')       THEN 'video'
  WHEN operation IN ('research_query', 'research_plan', 'research')                       THEN 'research'
  WHEN operation IN ('indexing', 'index_video', 'reindex_video', 'indexing_per_minute')   THEN 'indexing'
  WHEN operation IN ('search', 'search_query', 'clip_search')                             THEN 'search'
  WHEN operation IN ('tag_video', 'retag_video', 'vision', 'media_analysis')              THEN 'vision'
  WHEN operation IN ('stock_add', 'face_profile', 'product_demo')                         THEN 'other'
  ELSE 'other'
END
WHERE category IS NULL;

CREATE INDEX IF NOT EXISTS api_usage_user_category_idx
  ON public.api_usage (user_id, category, recorded_at DESC);

CREATE INDEX IF NOT EXISTS pt_user_category_idx
  ON public.point_transactions (user_id, category, created_at DESC);


-- ═════════════════════════════════════════════════════════════════════════════
-- 8. llm_model_tiers + compute_llm_credits — hybrid base+surcharge formula
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Maps an LLM model name to a billing band (light/standard/premium/local),
-- a base credit cost per call, and a per-block surcharge applied to tokens
-- above a context threshold. Authoritative server-side formula — never
-- computed on the client.

CREATE TABLE IF NOT EXISTS public.llm_model_tiers (
  model_pattern               TEXT PRIMARY KEY,             -- LIKE pattern, e.g. 'gpt-4o-mini%'
  tier_band                   TEXT NOT NULL,                -- light | standard | premium | local
  base_credits_per_call       INTEGER NOT NULL,             -- credits charged per call
  context_threshold_tokens    INTEGER NOT NULL DEFAULT 8000,
  surcharge_credits_per_block INTEGER NOT NULL DEFAULT 0,
  surcharge_block_tokens      INTEGER NOT NULL DEFAULT 4000,
  description                 TEXT,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_model_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read model tiers"
  ON public.llm_model_tiers FOR SELECT USING (TRUE);

INSERT INTO public.llm_model_tiers (
  model_pattern, tier_band, base_credits_per_call,
  context_threshold_tokens, surcharge_credits_per_block, surcharge_block_tokens,
  description
) VALUES
  -- Light tier: cheap models, 1 credit per call + 1 cr per 8k over 8k
  ('gpt-4o-mini%',         'light',    1, 8000, 1, 8000, 'OpenAI GPT-4o mini'),
  ('gpt-3.5%',             'light',    1, 8000, 1, 8000, 'OpenAI GPT-3.5'),
  ('gemini-2.0-flash%',    'light',    1, 8000, 1, 8000, 'Google Gemini 2.0 Flash'),
  ('gemini-1.5-flash%',    'light',    1, 8000, 1, 8000, 'Google Gemini 1.5 Flash'),
  ('gemini-2.5-flash%',    'light',    1, 8000, 1, 8000, 'Google Gemini 2.5 Flash'),
  ('claude-haiku%',        'light',    1, 8000, 1, 8000, 'Anthropic Claude Haiku'),
  ('claude-3-5-haiku%',    'light',    1, 8000, 1, 8000, 'Anthropic Claude 3.5 Haiku'),
  ('claude-haiku-4%',      'light',    1, 8000, 1, 8000, 'Anthropic Claude Haiku 4.x'),

  -- Standard tier: 5 credits + 2 cr per 4k over 8k
  ('gpt-4o%',              'standard', 5, 8000, 2, 4000, 'OpenAI GPT-4o'),
  ('gpt-4.1%',             'standard', 5, 8000, 2, 4000, 'OpenAI GPT-4.1'),
  ('gpt-4-turbo%',         'standard', 5, 8000, 2, 4000, 'OpenAI GPT-4 Turbo'),
  ('claude-3-5-sonnet%',   'standard', 5, 8000, 2, 4000, 'Anthropic Claude 3.5 Sonnet'),
  ('claude-sonnet%',       'standard', 5, 8000, 2, 4000, 'Anthropic Claude Sonnet'),
  ('claude-sonnet-4%',     'standard', 5, 8000, 2, 4000, 'Anthropic Claude Sonnet 4.x'),
  ('gemini-1.5-pro%',      'standard', 5, 8000, 2, 4000, 'Google Gemini 1.5 Pro'),
  ('gemini-2.5-pro%',      'standard', 5, 8000, 2, 4000, 'Google Gemini 2.5 Pro'),

  -- Premium tier: 25 credits + 5 cr per 4k over 8k
  ('claude-opus%',         'premium', 25, 8000, 5, 4000, 'Anthropic Claude Opus'),
  ('claude-3-opus%',       'premium', 25, 8000, 5, 4000, 'Anthropic Claude 3 Opus'),
  ('claude-opus-4%',       'premium', 25, 8000, 5, 4000, 'Anthropic Claude Opus 4.x'),
  ('o1%',                  'premium', 25, 8000, 5, 4000, 'OpenAI o1 reasoning'),
  ('o3%',                  'premium', 25, 8000, 5, 4000, 'OpenAI o3 reasoning'),

  -- Local tier: free
  ('ollama%',              'local',    0,    0, 0, 0,    'Ollama local models'),
  ('local%',               'local',    0,    0, 0, 0,    'Generic local model')
ON CONFLICT (model_pattern) DO UPDATE SET
  tier_band                   = EXCLUDED.tier_band,
  base_credits_per_call       = EXCLUDED.base_credits_per_call,
  context_threshold_tokens    = EXCLUDED.context_threshold_tokens,
  surcharge_credits_per_block = EXCLUDED.surcharge_credits_per_block,
  surcharge_block_tokens      = EXCLUDED.surcharge_block_tokens,
  description                 = EXCLUDED.description,
  updated_at                  = now();

-- compute_llm_credits: pure, deterministic formula. Returns the credits to
-- charge for one LLM call. Used by the backend on every chat completion.
CREATE OR REPLACE FUNCTION public.compute_llm_credits(
  p_model         TEXT,
  p_input_tokens  INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0
)
RETURNS TABLE(
  credits     INTEGER,
  tier_band   TEXT,
  base        INTEGER,
  surcharge   INTEGER,
  over_tokens INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row       public.llm_model_tiers%ROWTYPE;
  v_total_tok INTEGER;
  v_over_tok  INTEGER;
  v_blocks    INTEGER;
  v_surcharge INTEGER;
BEGIN
  -- Longest model_pattern match wins (most specific)
  SELECT * INTO v_row
  FROM public.llm_model_tiers
  WHERE lower(coalesce(p_model, '')) LIKE lower(model_pattern)
  ORDER BY length(model_pattern) DESC
  LIMIT 1;

  -- Unknown model → default to light tier
  IF NOT FOUND THEN
    v_row.tier_band                   := 'light';
    v_row.base_credits_per_call       := 1;
    v_row.context_threshold_tokens    := 8000;
    v_row.surcharge_credits_per_block := 1;
    v_row.surcharge_block_tokens      := 8000;
  END IF;

  -- Local models = always free
  IF v_row.tier_band = 'local' THEN
    RETURN QUERY SELECT 0, v_row.tier_band, 0, 0, 0;
    RETURN;
  END IF;

  v_total_tok := coalesce(p_input_tokens, 0) + coalesce(p_output_tokens, 0);
  v_over_tok  := GREATEST(0, v_total_tok - v_row.context_threshold_tokens);

  IF v_row.surcharge_block_tokens > 0 AND v_over_tok > 0 THEN
    v_blocks    := ceil(v_over_tok::NUMERIC / v_row.surcharge_block_tokens)::INTEGER;
    v_surcharge := v_blocks * v_row.surcharge_credits_per_block;
  ELSE
    v_surcharge := 0;
  END IF;

  RETURN QUERY SELECT
    (v_row.base_credits_per_call + v_surcharge),
    v_row.tier_band,
    v_row.base_credits_per_call,
    v_surcharge,
    v_over_tok;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_llm_credits(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_llm_credits(TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.compute_llm_credits(TEXT, INTEGER, INTEGER) TO service_role;


-- ═════════════════════════════════════════════════════════════════════════════
-- 9. check_credits_allowed — points-based pre-flight gate
-- ═════════════════════════════════════════════════════════════════════════════
--
-- New points-aware version. The legacy USD-based check_usage_allowed remains
-- in place for backwards compatibility (existing desktop builds may still
-- call it).

CREATE OR REPLACE FUNCTION public.check_credits_allowed(
  p_estimated_credits INTEGER DEFAULT 0
)
RETURNS TABLE(
  allowed          BOOLEAN,
  balance          INTEGER,
  required         INTEGER,
  in_standard_mode BOOLEAN,
  overage_enabled  BOOLEAN,
  tier             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uc   public.user_credits%ROWTYPE;
  v_tier TEXT := 'free';
BEGIN
  -- Auto-create row if missing
  INSERT INTO public.user_credits (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_uc
  FROM public.user_credits
  WHERE user_id = auth.uid();

  SELECT s.tier INTO v_tier
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  RETURN QUERY SELECT
    (v_uc.total_points >= p_estimated_credits) OR v_uc.overage_enabled,
    v_uc.total_points,
    p_estimated_credits,
    v_uc.in_standard_mode,
    v_uc.overage_enabled,
    coalesce(v_tier, 'free');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_credits_allowed(INTEGER) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 10. get_category_breakdown — dashboard LLM/Video/Indexing/Vision/etc. split
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_category_breakdown(
  p_month_offset INTEGER DEFAULT 0   -- 0 = current month, -1 = last month, etc.
)
RETURNS TABLE(
  category        TEXT,
  total_credits   BIGINT,
  total_usd_est   NUMERIC(10, 4),
  request_count   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    coalesce(pt.category, 'other')                       AS category,
    coalesce(SUM(-pt.points_delta), 0)::BIGINT           AS total_credits,
    (coalesce(SUM(-pt.points_delta), 0) * 0.01)::NUMERIC(10, 4) AS total_usd_est,
    COUNT(*)::BIGINT                                      AS request_count
  FROM public.point_transactions pt
  WHERE pt.user_id  = auth.uid()
    AND pt.txn_type = 'deduction'
    AND DATE_TRUNC('month', pt.created_at)
        = DATE_TRUNC('month', now() + (p_month_offset || ' months')::INTERVAL)
  GROUP BY coalesce(pt.category, 'other')
  ORDER BY total_credits DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_category_breakdown(INTEGER) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 11. allocate_free_tier_monthly — service-role cron entry point
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Grants 100 pts to every authenticated user without an active paid
-- subscription, idempotent per calendar month. Wire this to a pg_cron job
-- or a scheduled Edge Function.

CREATE OR REPLACE FUNCTION public.allocate_free_tier_monthly()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count    INTEGER := 0;
  v_already  INTEGER;
  v_free_pts INTEGER;
  r          RECORD;
BEGIN
  SELECT monthly_points INTO v_free_pts
  FROM public.tier_config
  WHERE tier = 'free';

  IF v_free_pts IS NULL OR v_free_pts <= 0 THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT u.id AS user_id
    FROM auth.users u
    LEFT JOIN public.subscriptions s
      ON s.user_id = u.id AND s.status IN ('active', 'trialing')
    WHERE s.user_id IS NULL
  LOOP
    SELECT COUNT(*) INTO v_already
    FROM public.point_transactions pt
    WHERE pt.user_id   = r.user_id
      AND pt.txn_type  = 'allocation'
      AND pt.operation = 'free_tier_monthly'
      AND DATE_TRUNC('month', pt.created_at) = DATE_TRUNC('month', now());

    IF v_already = 0 THEN
      PERFORM public.credit_points(
        r.user_id,
        v_free_pts,
        'subscription',
        'allocation',
        'free_tier_monthly',
        'Free tier monthly trial allocation'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_free_tier_monthly() TO service_role;


-- ═════════════════════════════════════════════════════════════════════════════
-- 12. Diagnostic comments — reference for future migrations
-- ═════════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE  public.stripe_webhook_events IS 'Idempotency log for Stripe webhook events. Service role only.';
COMMENT ON TABLE  public.usage_anomalies       IS 'Detected spend anomalies (today vs 30d baseline).';
COMMENT ON TABLE  public.llm_model_tiers       IS 'LLM model → credit-billing band + hybrid formula config.';
COMMENT ON COLUMN public.api_usage.category    IS 'Coarse category for dashboard split: llm | video | indexing | search | research | vision | other';
COMMENT ON COLUMN public.point_transactions.category IS 'Coarse category derived from operation/txn_type. system|refund|overage for non-deduction rows.';
