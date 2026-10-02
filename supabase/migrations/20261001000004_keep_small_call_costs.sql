-- ============================================================================
-- A call too small to round to a millionth of a dollar was free
-- ============================================================================
-- calculate_api_cost and compute_llm_credits both held the dollar cost in a
-- NUMERIC(12, 6). Anything under half a millionth of a dollar rounds to zero
-- there -- a gpt-5-nano call of one token in and one out costs $0.00000045 --
-- and compute_usd_credits returns 0 for a zero cost before its one-credit
-- minimum applies. So the call was free instead of 1 credit.
--
-- Both variables become unconstrained NUMERIC. Nothing else in either function
-- changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_api_cost(
  p_provider           TEXT,
  p_model              TEXT,
  p_input_tokens       INTEGER,
  p_output_tokens      INTEGER,
  p_units              INTEGER DEFAULT 1,
  p_cache_read_tokens  INTEGER DEFAULT 0,
  p_cache_write_tokens INTEGER DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_row public.api_pricing%ROWTYPE;
  v_cost NUMERIC := 0;
BEGIN
  SELECT * INTO v_row
  FROM public.api_pricing
  WHERE provider = p_provider
    AND lower(coalesce(p_model, '')) LIKE lower(model_pattern)
  ORDER BY length(model_pattern) DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_row.flat_cost_per_unit > 0 AND coalesce(p_input_tokens, 0) = 0 AND coalesce(p_output_tokens, 0) = 0 THEN
    RETURN v_row.flat_cost_per_unit * GREATEST(1, coalesce(p_units, 1));
  END IF;

  v_cost := (coalesce(p_input_tokens, 0)  * v_row.input_cost_per_million  / 1000000.0)
          + (coalesce(p_output_tokens, 0) * v_row.output_cost_per_million / 1000000.0)
          + (coalesce(p_cache_read_tokens, 0)  * coalesce(v_row.cache_read_cost_per_million, 0)  / 1000000.0)
          + (coalesce(p_cache_write_tokens, 0) * coalesce(v_row.cache_write_cost_per_million, 0) / 1000000.0);
  RETURN v_cost;
END;
$function$;


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
  v_usd      NUMERIC;
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
