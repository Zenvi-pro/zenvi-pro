-- ============================================================================
-- charge_llm_call has failed on every call since 2026-09-17
-- ============================================================================
-- That day's credit-burn migration added compute_llm_credits(model, in, out,
-- cache_read, cache_write) with a default on every token argument, next to the
-- original three-argument overload. A three-argument call now matches both, so
-- Postgres refuses it:
--
--   function public.compute_llm_credits(text, integer, integer) is not unique
--
-- charge_llm_call makes exactly that call. It is what bills a model call made
-- outside a chat turn (planning helpers, tools that run their own model), so
-- those have gone uncharged, with only a warning in the backend log.
--
-- Same body as before; the call names all five arguments.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.charge_llm_call(
  p_model           TEXT,
  p_input_tokens    INTEGER DEFAULT 0,
  p_output_tokens   INTEGER DEFAULT 0,
  p_provider        TEXT DEFAULT NULL,
  p_note            TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_credits INTEGER; v_provider TEXT; v_category TEXT := 'llm';
BEGIN
  SELECT c.credits INTO v_credits
  FROM public.compute_llm_credits(p_model, p_input_tokens, p_output_tokens, 0, 0) c LIMIT 1;
  IF COALESCE(v_credits, 0) <= 0 THEN RETURN 'ok'; END IF;
  v_provider := COALESCE(p_provider, CASE
    WHEN lower(coalesce(p_model, '')) LIKE '%gpt%' OR lower(p_model) LIKE '%openai%' THEN 'openai'
    WHEN lower(coalesce(p_model, '')) LIKE '%claude%' THEN 'anthropic'
    WHEN lower(coalesce(p_model, '')) LIKE '%gemini%' THEN 'google'
    WHEN lower(coalesce(p_model, '')) LIKE '%ollama%' OR lower(p_model) LIKE '%local%' THEN 'ollama'
    ELSE 'unknown' END);
  RETURN public.deduct_points(v_credits, 'chat', v_provider, NULL, p_note, v_category, p_idempotency_key,
    p_model, COALESCE(p_input_tokens, 0), COALESCE(p_output_tokens, 0), 1, NULL);
END;
$function$;
