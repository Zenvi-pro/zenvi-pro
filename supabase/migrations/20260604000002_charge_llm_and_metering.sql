-- ─────────────────────────────────────────────────────────────────────────────
-- Unified ledger metering on point_transactions + charge_llm_call
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS input_tokens  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units         INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cost_usd      NUMERIC(10, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS model         TEXT;

-- model may already exist via provider column usage; ensure model column exists
COMMENT ON COLUMN public.point_transactions.cost_usd IS
  'Provider cost estimate from api_pricing at charge time';

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
AS $$
DECLARE
  v_credits     INTEGER;
  v_tier_band   TEXT;
  v_provider    TEXT;
  v_cost        NUMERIC(10, 6);
  v_category    TEXT := 'llm';
  v_result      TEXT;
BEGIN
  SELECT c.credits INTO v_credits
  FROM public.compute_llm_credits(p_model, p_input_tokens, p_output_tokens) c
  LIMIT 1;

  IF COALESCE(v_credits, 0) <= 0 THEN
    RETURN 'ok';
  END IF;

  v_provider := COALESCE(
    p_provider,
    CASE
      WHEN lower(coalesce(p_model, '')) LIKE '%gpt%' OR lower(p_model) LIKE '%openai%' THEN 'openai'
      WHEN lower(coalesce(p_model, '')) LIKE '%claude%' THEN 'anthropic'
      WHEN lower(coalesce(p_model, '')) LIKE '%gemini%' THEN 'google'
      WHEN lower(coalesce(p_model, '')) LIKE '%ollama%' OR lower(p_model) LIKE '%local%' THEN 'ollama'
      ELSE 'unknown'
    END
  );

  v_cost := public.calculate_api_cost(
    v_provider,
    coalesce(p_model, ''),
    coalesce(p_input_tokens, 0),
    coalesce(p_output_tokens, 0),
    1
  );

  v_result := public.deduct_points(
    v_credits,
    'chat',
    v_provider,
    NULL,
    p_note,
    v_category,
    p_idempotency_key
  );

  IF v_result = 'ok' THEN
    UPDATE public.point_transactions pt
    SET
      model         = p_model,
      input_tokens  = coalesce(p_input_tokens, 0),
      output_tokens = coalesce(p_output_tokens, 0),
      units         = 1,
      cost_usd      = v_cost
    FROM (
      SELECT id
      FROM public.point_transactions
      WHERE user_id = auth.uid()
        AND txn_type = 'deduction'
        AND operation = 'chat'
        AND (
          (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
          OR (
            p_idempotency_key IS NULL
            AND created_at >= now() - interval '2 seconds'
          )
        )
      ORDER BY created_at DESC
      LIMIT 1
    ) latest
    WHERE pt.id = latest.id;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.charge_llm_call(
  TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.charge_llm_call IS
  'Deduct LLM credits from llm_model_tiers; records tokens and cost_usd on point_transactions.';
