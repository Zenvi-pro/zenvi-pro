-- ─────────────────────────────────────────────────────────────────────────────
-- Deprecate api_usage client writes — analytics live on point_transactions
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.api_usage IS
  'DEPRECATED for new writes. Use point_transactions (tokens, cost_usd). Kept for historical rows.';

COMMENT ON FUNCTION public.batch_record_api_usage IS
  'DEPRECATED — no-op. Usage is recorded via charge_llm_call / charge_operation.';

COMMENT ON FUNCTION public.check_usage_allowed IS
  'DEPRECATED — use check_operation_allowed or check_credits_allowed.';

-- No-op batch_record_api_usage (preserves RPC signature for older clients during rollout)
CREATE OR REPLACE FUNCTION public.batch_record_api_usage(records JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_usage_allowed(NUMERIC) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_usage_allowed(NUMERIC) FROM anon;
