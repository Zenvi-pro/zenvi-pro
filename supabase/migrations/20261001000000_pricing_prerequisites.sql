-- ============================================================================
-- What the model-pricing migration stands on
-- ============================================================================
-- Production has three things this repository's migrations never created. They
-- arrived with the 2026-09-17 credit-burn work, part of it as recorded
-- migrations that were not committed here and part as SQL run by hand:
--
--   * api_pricing.cache_read_cost_per_million / cache_write_cost_per_million
--   * compute_usd_credits(usd, margin)
--   * calculate_api_cost(...) with the two cache-token arguments
--
-- Without them the next migration fails on a database built from this
-- repository: its INSERT names the cache columns, and compute_llm_credits calls
-- both functions.
--
-- Everything here is idempotent and matches production as of 2026-10-01, so on
-- production this migration changes nothing.
-- ============================================================================

ALTER TABLE public.api_pricing
  ADD COLUMN IF NOT EXISTS cache_read_cost_per_million  NUMERIC(12, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_write_cost_per_million NUMERIC(12, 6) DEFAULT 0;


-- credits = CEIL(usd * 100 * margin): 100 credits per dollar of user spend,
-- never less than 1 for a call that cost anything.
CREATE OR REPLACE FUNCTION public.compute_usd_credits(
  p_usd    NUMERIC,
  p_margin NUMERIC DEFAULT 2.0
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  IF p_usd IS NULL OR p_usd <= 0 THEN RETURN 0; END IF;
  RETURN GREATEST(1, CEIL(p_usd * 100.0 * COALESCE(NULLIF(p_margin, 0), 2.0))::INTEGER);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.compute_usd_credits(NUMERIC, NUMERIC)
  TO authenticated, service_role, anon;


-- Dollar cost of one call: the longest model_pattern that matches within the
-- provider, with cached input priced apart from fresh input.
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
  v_cost NUMERIC(12, 6) := 0;
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
