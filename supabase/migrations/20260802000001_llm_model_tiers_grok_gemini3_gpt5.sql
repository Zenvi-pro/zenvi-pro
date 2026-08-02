-- ============================================================================
-- llm_model_tiers: bands for Grok, Gemini 3.x, the GPT-5 family, o4 and Fable
-- ============================================================================
-- compute_llm_credits() resolves a model by longest matching model_pattern and
-- falls back to the *light* band (1 credit/call) when nothing matches. That
-- makes a missing row an under-billing bug rather than an error, and several
-- families currently have no row at all:
--
--   * grok%            — new xAI provider, nothing matched
--   * gpt-5%           — 'gpt-4o%' does not match 'gpt-5'; the whole GPT-5
--                        family has been billing at 1 credit since it was
--                        added to the model list
--   * o4%              — o1% and o3% exist, o4-mini was missed
--   * gemini-3%        — only 1.5/2.0/2.5 were seeded
--   * claude-fable%    — 'claude-opus%'/'claude-sonnet%' don't match it
--
-- Patterns are matched against the model name the provider reports, not the
-- catalog's provider-prefixed id, and OpenAI reports dated snapshots
-- (e.g. 'gpt-4o-mini-2024-07-18') — hence the trailing % on every pattern.
--
-- Band assignment follows the existing seed's logic: mini/nano/flash → light,
-- mid-range → standard, frontier reasoning models → premium.
-- ============================================================================

INSERT INTO public.llm_model_tiers (
  model_pattern, tier_band, base_credits_per_call,
  context_threshold_tokens, surcharge_credits_per_block, surcharge_block_tokens,
  description
) VALUES
  -- ---- xAI (Grok) --------------------------------------------------------
  -- Grok 4.x sits around Sonnet pricing, so standard is the right baseline.
  -- No separate row for the 4.20 reasoning variant: 'grok-4.20%reasoning%'
  -- also matches 'grok-4.20-0309-non-reasoning', which would bill the cheaper
  -- variant at the premium rate.
  ('grok%',                 'standard',  5, 8000, 2, 4000, 'xAI Grok (baseline)'),
  ('grok-build%',           'light',     1, 8000, 1, 8000, 'xAI Grok build (small)'),

  -- ---- OpenAI GPT-5 family ----------------------------------------------
  ('gpt-5%',                'standard',  5, 8000, 2, 4000, 'OpenAI GPT-5 family'),
  ('gpt-5-mini%',           'light',     1, 8000, 1, 8000, 'OpenAI GPT-5 mini'),
  ('gpt-5-nano%',           'light',     1, 8000, 1, 8000, 'OpenAI GPT-5 nano'),
  ('gpt-5.4-mini%',         'light',     1, 8000, 1, 8000, 'OpenAI GPT-5.4 mini'),
  ('gpt-5.4-nano%',         'light',     1, 8000, 1, 8000, 'OpenAI GPT-5.4 nano'),
  -- Current frontier tier — reasoning-heavy, priced like the o-series.
  ('gpt-5.5%',              'premium',  25, 8000, 5, 4000, 'OpenAI GPT-5.5'),
  ('gpt-5.6%',              'premium',  25, 8000, 5, 4000, 'OpenAI GPT-5.6'),

  -- ---- OpenAI o-series gap ----------------------------------------------
  ('o4%',                   'premium',  25, 8000, 5, 4000, 'OpenAI o4 reasoning'),

  -- ---- Anthropic --------------------------------------------------------
  -- Fable is priced above the Opus tier and matches neither claude-opus% nor
  -- claude-sonnet%, so without this row it billed as light.
  ('claude-fable%',         'premium',  25, 8000, 5, 4000, 'Anthropic Claude Fable'),
  ('claude-mythos%',        'premium',  25, 8000, 5, 4000, 'Anthropic Claude Mythos'),

  -- ---- Google Gemini 3.x ------------------------------------------------
  -- Explicit per-variant rows rather than mid-string wildcards, so the
  -- longest-match resolution stays obvious to read.
  ('gemini-3%',             'standard',  5, 8000, 2, 4000, 'Google Gemini 3.x (baseline)'),
  ('gemini-3-flash%',       'light',     1, 8000, 1, 8000, 'Google Gemini 3 Flash'),
  ('gemini-3.1-flash%',     'light',     1, 8000, 1, 8000, 'Google Gemini 3.1 Flash'),
  ('gemini-3.5-flash%',     'light',     1, 8000, 1, 8000, 'Google Gemini 3.5 Flash'),
  ('gemini-3.6-flash%',     'light',     1, 8000, 1, 8000, 'Google Gemini 3.6 Flash'),
  ('gemini-3-pro%',         'standard',  5, 8000, 2, 4000, 'Google Gemini 3 Pro'),
  ('gemini-3.1-pro%',       'standard',  5, 8000, 2, 4000, 'Google Gemini 3.1 Pro'),
  ('gemini-flash-latest%',  'light',     1, 8000, 1, 8000, 'Google Gemini Flash (latest)'),
  ('gemini-pro-latest%',    'standard',  5, 8000, 2, 4000, 'Google Gemini Pro (latest)'),

  -- ---- Local models must be free ----------------------------------------
  -- The seed has 'ollama%' and 'local%', but the provider reports the bare
  -- model name ('llama3.2'), which matches neither — so local inference has
  -- been billing 1 credit/call via the light-tier default instead of 0.
  ('llama%',                'local',     0,    0, 0, 0,    'Local Llama via Ollama'),
  ('mistral%',              'local',     0,    0, 0, 0,    'Local Mistral via Ollama'),
  ('qwen%',                 'local',     0,    0, 0, 0,    'Local Qwen via Ollama'),
  ('gemma%',                'local',     0,    0, 0, 0,    'Local Gemma via Ollama'),
  ('phi%',                  'local',     0,    0, 0, 0,    'Local Phi via Ollama'),
  ('deepseek%',             'local',     0,    0, 0, 0,    'Local DeepSeek via Ollama')
ON CONFLICT (model_pattern) DO UPDATE SET
  tier_band                   = EXCLUDED.tier_band,
  base_credits_per_call       = EXCLUDED.base_credits_per_call,
  context_threshold_tokens    = EXCLUDED.context_threshold_tokens,
  surcharge_credits_per_block = EXCLUDED.surcharge_credits_per_block,
  surcharge_block_tokens      = EXCLUDED.surcharge_block_tokens,
  description                 = EXCLUDED.description,
  updated_at                  = now();
