-- ============================================================================
-- api_pricing becomes the one source of truth for what a chat model costs
-- ============================================================================
-- compute_llm_credits() read two tables. llm_model_tiers decided the band and
-- a per-call formula; api_pricing decided the dollar cost, and whenever that
-- cost was above zero it won. Every provider has a '%' catch-all row, so in
-- practice api_pricing priced every call and llm_model_tiers was only consulted
-- to make local models free. Two tables, one of them decorative, and both out
-- of date:
--
--   * no row for the GPT-5 family at all, so gpt-5-nano, gpt-5.4-mini and
--     gpt-5.6-luna billed at the openai '%' rate of $5 / $15 per 1M, with
--     cached input at $2.50 -- 25x to 125x their list price. This is the
--     "small model drains credits" complaint.
--   * 'claude-opus%' at $15 / $75: every Opus since 4.5 lists at $5 / $25.
--   * 'o3%' at $30 / $120 (lists at $2 / $8); 'gpt-4o%' at $5 / $15 ($2.50 / $10).
--   * the other direction: Gemini 3.x fell to the google '%' row at
--     $0.075 / $0.30 with free cache reads (3.1 Pro lists at $2 / $12), and
--     Claude Fable fell to the anthropic '%' row at $3 / $15 ($10 / $50).
--   * Grok matched no provider and was priced as OpenAI.
--
-- After this migration a chat model is priced by exactly one api_pricing row:
-- the longest model_pattern that matches within its provider. Credits are
-- CEIL(usd * 100 * 2.0), as before. Nothing reads llm_model_tiers after this; the
-- next migration drops it.
--
-- The assistant's model picker reads this table too (zenvi-backend
-- core/providers/pricing.py): a model is offered only when a row other than
-- its provider's '%' matches it. So adding a model to Zenvi is adding its row
-- here, and a release a provider ships before it has a row stays out of the
-- picker instead of billing at a guess. The '%' rows remain as the safety net
-- that keeps an unpriced model from ever running free.
--
-- Prices are USD per 1M tokens, list price, from the models.dev catalogue on
-- 2026-10-01. input is fresh (uncached) input; cache_read / cache_write are
-- priced separately. Rows marked (*) were not in that catalogue -- check them.
-- ============================================================================

INSERT INTO public.api_pricing (
  provider, model_pattern,
  input_cost_per_million, output_cost_per_million,
  cache_read_cost_per_million, cache_write_cost_per_million
) VALUES
  -- ---- OpenAI ------------------------------------------------------------
  ('openai', 'gpt-4o%',            2.50,  10.00, 1.25,   0),
  ('openai', 'gpt-4o-mini%',       0.15,   0.60, 0.075,  0),
  ('openai', 'gpt-4.1%',           2.00,   8.00, 0.50,   0),
  ('openai', 'gpt-4.1-mini%',      0.40,   1.60, 0.10,   0),
  ('openai', 'gpt-4.1-nano%',      0.10,   0.40, 0.025,  0),
  -- gpt-5 and gpt-5.1 share a price; later point releases have their own row.
  ('openai', 'gpt-5%',             1.25,  10.00, 0.125,  0),
  ('openai', 'gpt-5-mini%',        0.25,   2.00, 0.025,  0),
  ('openai', 'gpt-5-nano%',        0.05,   0.40, 0.005,  0),
  ('openai', 'gpt-5-pro%',        15.00, 120.00, 0,      0),
  ('openai', 'gpt-5.2%',           1.75,  14.00, 0.175,  0),
  ('openai', 'gpt-5.2-pro%',      21.00, 168.00, 0,      0),
  ('openai', 'gpt-5.3%',           1.75,  14.00, 0.175,  0),
  ('openai', 'gpt-5.4%',           2.50,  15.00, 0.25,   0),
  ('openai', 'gpt-5.4-mini%',      0.75,   4.50, 0.075,  0),
  ('openai', 'gpt-5.4-nano%',      0.20,   1.25, 0.02,   0),
  ('openai', 'gpt-5.4-pro%',      30.00, 180.00, 0,      0),
  ('openai', 'gpt-5.5%',           5.00,  30.00, 0.50,   0),
  ('openai', 'gpt-5.5-pro%',      30.00, 180.00, 0,      0),
  -- gpt-5.6 is the sol price; terra and luna are the smaller siblings.
  ('openai', 'gpt-5.6%',           4.00,  20.00, 0.40,   5.00),
  ('openai', 'gpt-5.6-terra%',     2.00,  12.00, 0.20,   2.50),
  ('openai', 'gpt-5.6-luna%',      0.20,   1.20, 0.02,   0.25),
  -- GPT-6 (2026-09). No 'gpt-6%' baseline on purpose: a new variant stays out
  -- of the picker until it has a price.
  ('openai', 'gpt-6-astra%',      10.00,  50.00, 1.00,  12.50),
  ('openai', 'gpt-6-sol%',         2.00,  10.00, 0.20,   2.50),
  ('openai', 'gpt-6-luna%',        0.10,   0.50, 0.01,   0.125),
  ('openai', 'gpt-6.1-sol%',       2.00,  10.00, 0.10,   2.50),
  ('openai', 'o1-pro%',          150.00, 600.00, 0,      0),
  ('openai', 'o3%',                2.00,   8.00, 0.50,   0),
  ('openai', 'o3-mini%',           1.10,   4.40, 0.55,   0),
  ('openai', 'o3-pro%',           20.00,  80.00, 0,      0),
  ('openai', 'o4-mini%',           1.10,   4.40, 0.275,  0),

  -- ---- Anthropic ---------------------------------------------------------
  -- Opus has listed at $5 / $25 since 4.5. The two older generations that
  -- still list at $15 / $75 get rows of their own ('claude-opus-4-2%' is the
  -- dated id of Opus 4.0, claude-opus-4-20250514).
  ('anthropic', 'claude-opus%',        5.00,  25.00, 0.50,  6.25),
  ('anthropic', 'claude-opus-4-1%',   15.00,  75.00, 1.50, 18.75),
  ('anthropic', 'claude-opus-4-2%',   15.00,  75.00, 1.50, 18.75),
  ('anthropic', 'claude-opus-5-5%',    4.00,  20.00, 0.20,  5.00),
  ('anthropic', 'claude-sonnet-5%',    2.00,  10.00, 0.20,  2.50),
  ('anthropic', 'claude-fable%',      10.00,  50.00, 1.00, 12.50),
  ('anthropic', 'claude-fable-5-1%',  10.00,  50.00, 0.25, 12.50),

  -- ---- Google ------------------------------------------------------------
  ('google', 'gemini-2.5-flash%',       0.30,  2.50, 0.03,  0),
  ('google', 'gemini-2.5-flash-lite%',  0.10,  0.40, 0.01,  0),
  ('google', 'gemini-2.5-pro%',         1.25, 10.00, 0.125, 0),
  ('google', 'gemini-3-flash%',         0.50,  3.00, 0.05,  0),
  ('google', 'gemini-3-pro%',           2.00, 12.00, 0.20,  0),   -- (*)
  ('google', 'gemini-3.1-pro%',         2.00, 12.00, 0.20,  0),
  ('google', 'gemini-3.1-flash-lite%',  0.25,  1.50, 0.025, 0),
  ('google', 'gemini-3.5-flash%',       1.50,  9.00, 0.15,  0),
  ('google', 'gemini-3.5-flash-lite%',  0.30,  2.50, 0.03,  0),
  ('google', 'gemini-3.6-flash%',       0.75,  3.75, 0.075, 0),
  ('google', 'gemini-3.7-flash%',       0.75,  3.75, 0.075, 0),
  ('google', 'gemini-3.8-flash%',       0.75,  3.75, 0.075, 0),
  ('google', 'gemini-flash-latest%',    0.75,  3.75, 0.075, 0),
  ('google', 'gemini-flash-lite-latest%', 0.30, 2.50, 0.03, 0),
  ('google', 'gemini-pro-latest%',      2.00, 12.00, 0.20,  0),   -- (*)

  -- ---- xAI ---------------------------------------------------------------
  -- Grok had no provider of its own and was priced by the openai '%' row.
  ('xai', 'grok-4.20%',            1.25,   2.50, 0.20,   0),
  ('xai', 'grok-4.3%',             1.25,   2.50, 0.20,   0),
  ('xai', 'grok-4.5%',             2.00,   6.00, 0.30,   0),
  ('xai', 'grok-4.6%',             2.00,   6.00, 0.50,   0),
  ('xai', 'grok-4.7%',             2.00,   6.00, 0.50,   0),
  ('xai', 'grok-build%',           1.00,   2.00, 0.20,   0),
  -- Safety net only: what an unpriced Grok model billed at before this change.
  ('xai', '%',                     5.00,  15.00, 2.50,   5.00),

  -- ---- Local models ------------------------------------------------------
  -- Free. Was the 'local' band in llm_model_tiers; the same name prefixes
  -- compute_llm_credits maps to this provider.
  ('ollama', 'llama%',             0,      0,    0,      0),
  ('ollama', 'mistral%',           0,      0,    0,      0),
  ('ollama', 'qwen%',              0,      0,    0,      0),
  ('ollama', 'gemma%',             0,      0,    0,      0),
  ('ollama', 'phi%',               0,      0,    0,      0),
  ('ollama', 'deepseek%',          0,      0,    0,      0),
  ('ollama', '%',                  0,      0,    0,      0)
ON CONFLICT (provider, model_pattern) DO UPDATE SET
  input_cost_per_million       = EXCLUDED.input_cost_per_million,
  output_cost_per_million      = EXCLUDED.output_cost_per_million,
  cache_read_cost_per_million  = EXCLUDED.cache_read_cost_per_million,
  cache_write_cost_per_million = EXCLUDED.cache_write_cost_per_million,
  effective_from               = now();


-- compute_llm_credits: one lookup, in api_pricing.
--
-- The provider is inferred from the model name because that is all the caller
-- sends. Same return shape as before so no caller changes: tier_band is now
-- only 'local' (free) or 'metered', and base / surcharge / over_tokens, which
-- described the per-call formula, are credits / 0 / 0.
CREATE OR REPLACE FUNCTION public.compute_llm_credits(
  p_model              TEXT,
  p_input_tokens       INTEGER DEFAULT 0,
  p_output_tokens      INTEGER DEFAULT 0,
  p_cache_read_tokens  INTEGER DEFAULT 0,
  p_cache_write_tokens INTEGER DEFAULT 0
)
RETURNS TABLE(
  credits     INTEGER,
  tier_band   TEXT,
  base        INTEGER,
  surcharge   INTEGER,
  over_tokens INTEGER,
  usd_cost    NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_model    TEXT := lower(coalesce(p_model, ''));
  v_provider TEXT;
  v_usd      NUMERIC(12, 6);
  v_credits  INTEGER;
BEGIN
  v_provider := CASE
    WHEN v_model LIKE '%claude%' OR v_model LIKE '%anthropic%' THEN 'anthropic'
    WHEN v_model LIKE '%gemini%' OR v_model LIKE '%google%'    THEN 'google'
    WHEN v_model LIKE '%grok%'   OR v_model LIKE '%xai%'       THEN 'xai'
    WHEN v_model LIKE 'ollama%'  OR v_model LIKE 'local%'
      OR v_model LIKE 'llama%'   OR v_model LIKE 'mistral%'
      OR v_model LIKE 'qwen%'    OR v_model LIKE 'gemma%'
      OR v_model LIKE 'phi%'     OR v_model LIKE 'deepseek%'   THEN 'ollama'
    ELSE 'openai'
  END;

  v_usd := public.calculate_api_cost(
    v_provider, v_model,
    coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0),
    1, coalesce(p_cache_read_tokens, 0), coalesce(p_cache_write_tokens, 0)
  );

  -- 0 for a free row; otherwise at least 1 credit.
  v_credits := public.compute_usd_credits(v_usd, 2.0);

  RETURN QUERY SELECT
    v_credits,
    CASE WHEN v_provider = 'ollama' THEN 'local' ELSE 'metered' END,
    v_credits,
    0,
    0,
    v_usd;
END;
$function$;

