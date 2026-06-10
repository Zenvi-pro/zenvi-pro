-- ─────────────────────────────────────────────────────────────────────────────
-- Enriched point history RPC — full ledger fields + operation_pricing label
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_point_history(INT);

CREATE OR REPLACE FUNCTION public.get_point_history(
  p_limit         INT  DEFAULT 50,
  p_month_offset  INT  DEFAULT NULL,   -- NULL = all time (last N rows); 0 = this month; -1 = last month
  p_txn_type      TEXT DEFAULT NULL    -- NULL = all types; e.g. 'deduction', 'allocation', 'refund'
)
RETURNS TABLE(
  id                  UUID,
  txn_type            TEXT,
  points_delta        INTEGER,
  bucket              TEXT,
  operation           TEXT,
  category            TEXT,
  provider            TEXT,
  model               TEXT,
  input_tokens        INTEGER,
  output_tokens       INTEGER,
  total_tokens        INTEGER,
  quantity            INTEGER,
  duration_seconds    NUMERIC,
  balance_after       INTEGER,
  note                TEXT,
  refund_of           UUID,
  idempotency_key     TEXT,
  created_at          TIMESTAMPTZ,
  operation_label     TEXT,
  credits_charged     INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.txn_type,
    pt.points_delta,
    pt.bucket,
    pt.operation,
    COALESCE(pt.category, 'other'),
    pt.provider,
    pt.model,
    COALESCE(pt.input_tokens, 0),
    COALESCE(pt.output_tokens, 0),
    COALESCE(pt.total_tokens, COALESCE(pt.input_tokens, 0) + COALESCE(pt.output_tokens, 0)),
    COALESCE(pt.quantity, 1),
    pt.duration_seconds,
    pt.balance_after,
    pt.note,
    pt.refund_of,
    pt.idempotency_key,
    pt.created_at,
    COALESCE(
      op.description,
      CASE
        WHEN pt.operation = 'chat' AND pt.model IS NOT NULL AND pt.model <> ''
          THEN format('LLM chat (%s)', pt.model)
        WHEN pt.operation IS NOT NULL AND pt.operation <> ''
          THEN replace(pt.operation, '_', ' ')
        ELSE pt.txn_type
      END
    ) AS operation_label,
    ABS(pt.points_delta)::INTEGER AS credits_charged
  FROM public.point_transactions pt
  LEFT JOIN public.operation_pricing op
    ON op.operation_key = pt.operation AND op.active = TRUE
  WHERE pt.user_id = auth.uid()
    AND (p_txn_type IS NULL OR pt.txn_type = p_txn_type)
    AND (
      p_month_offset IS NULL
      OR DATE_TRUNC('month', pt.created_at)
         = DATE_TRUNC('month', now() + (p_month_offset || ' months')::INTERVAL)
    )
  ORDER BY pt.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_point_history(INT, INT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_point_history IS
  'User ledger history with metering fields and operation_pricing.description as operation_label.';
