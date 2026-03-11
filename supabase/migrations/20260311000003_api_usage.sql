-- ── api_pricing ────────────────────────────────────────────────────────────────
-- Configurable cost table. Update rows here when provider prices change —
-- no code redeploy needed. Cost computed server-side to prevent client manipulation.
CREATE TABLE IF NOT EXISTS public.api_pricing (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                 TEXT NOT NULL,
  model_pattern            TEXT NOT NULL,            -- LIKE pattern, e.g. 'gpt-4o%'
  input_cost_per_million   NUMERIC(10, 4) NOT NULL DEFAULT 0,
  output_cost_per_million  NUMERIC(10, 4) NOT NULL DEFAULT 0,
  flat_cost_per_unit       NUMERIC(10, 6) NOT NULL DEFAULT 0,  -- for generation APIs
  effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, model_pattern)
);

ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing" ON public.api_pricing FOR SELECT USING (true);

-- Seed — updated to March 2026 prices (adjust as needed)
INSERT INTO public.api_pricing (provider, model_pattern, input_cost_per_million, output_cost_per_million) VALUES
  ('openai',     'gpt-4o-mini%',           0.15,   0.60),
  ('openai',     'gpt-4o%',                5.00,  15.00),
  ('openai',     'gpt-4-turbo%',          10.00,  30.00),
  ('openai',     'gpt-3.5%',               0.50,   1.50),
  ('openai',     '%',                       5.00,  15.00),
  ('anthropic',  'claude-3-5-haiku%',      0.80,   4.00),
  ('anthropic',  'claude-haiku%',          0.25,   1.25),
  ('anthropic',  'claude-3-5-sonnet%',     3.00,  15.00),
  ('anthropic',  'claude-sonnet%',         3.00,  15.00),
  ('anthropic',  'claude-3-opus%',        15.00,  75.00),
  ('anthropic',  'claude-opus%',          15.00,  75.00),
  ('anthropic',  '%',                      3.00,  15.00),
  ('google',     'gemini-1.5-pro%',        3.50,  10.50),
  ('google',     'gemini-1.5-flash%',      0.075,  0.30),
  ('google',     '%',                      0.075,  0.30)
ON CONFLICT (provider, model_pattern) DO NOTHING;

-- Runware: flat cost per generation
INSERT INTO public.api_pricing (provider, model_pattern, flat_cost_per_unit) VALUES
  ('runware', '%', 0.10)
ON CONFLICT (provider, model_pattern) DO NOTHING;

-- ── tier_limits ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tier_limits (
  tier              TEXT PRIMARY KEY,
  monthly_usd_limit NUMERIC(10, 2) NOT NULL,
  description       TEXT
);

ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tier limits" ON public.tier_limits FOR SELECT USING (true);

INSERT INTO public.tier_limits (tier, monthly_usd_limit, description) VALUES
  ('none',    2.00, 'Free / no active subscription — trial budget'),
  ('creator', 10.00, 'Creator plan — $29/mo'),
  ('pro',     25.00, 'Pro plan — $49/mo'),
  ('studio',  60.00, 'Studio plan — $99/mo')
ON CONFLICT (tier) DO NOTHING;

-- ── api_usage ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,             -- openai | anthropic | runware | google
  model         TEXT,                      -- gpt-4o-mini, claude-3-5-sonnet, etc.
  operation     TEXT,                      -- chat | tts | video_generation | vision
  input_tokens  INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  units         INT NOT NULL DEFAULT 1,    -- for non-token APIs (e.g. 1 video = 1 unit)
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  app_version   TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.api_usage FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS api_usage_user_month_idx
  ON public.api_usage (user_id, DATE_TRUNC('month', recorded_at) DESC);

CREATE INDEX IF NOT EXISTS api_usage_user_provider_idx
  ON public.api_usage (user_id, provider);

-- ── calculate_api_cost ────────────────────────────────────────────────────────
-- Pure function — cost is always recomputed server-side from api_pricing.
CREATE OR REPLACE FUNCTION public.calculate_api_cost(
  p_provider      TEXT,
  p_model         TEXT,
  p_input_tokens  INT,
  p_output_tokens INT,
  p_units         INT DEFAULT 1
)
RETURNS NUMERIC(10, 6)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_row api_pricing%ROWTYPE;
BEGIN
  -- Most-specific match wins (longer model_pattern = higher priority)
  SELECT * INTO v_row
  FROM api_pricing
  WHERE provider = p_provider
    AND lower(coalesce(p_model, '')) LIKE lower(model_pattern)
  ORDER BY length(model_pattern) DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_row.flat_cost_per_unit > 0 THEN
    RETURN v_row.flat_cost_per_unit * p_units;
  END IF;

  RETURN (p_input_tokens  * v_row.input_cost_per_million  / 1000000.0)
       + (p_output_tokens * v_row.output_cost_per_million / 1000000.0);
END;
$$;

-- ── batch_record_api_usage ────────────────────────────────────────────────────
-- Desktop app flushes a JSON array of records. Cost is recomputed server-side.
CREATE OR REPLACE FUNCTION public.batch_record_api_usage(records JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec      JSONB;
  inserted INT := 0;
  v_cost   NUMERIC(10, 6);
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(records) LOOP
    v_cost := calculate_api_cost(
      rec->>'provider',
      coalesce(rec->>'model', ''),
      coalesce((rec->>'input_tokens')::INT,  0),
      coalesce((rec->>'output_tokens')::INT, 0),
      coalesce((rec->>'units')::INT,         1)
    );

    INSERT INTO api_usage (
      user_id, provider, model, operation,
      input_tokens, output_tokens, units,
      cost_usd, app_version, recorded_at
    ) VALUES (
      auth.uid(),
      rec->>'provider',
      rec->>'model',
      rec->>'operation',
      coalesce((rec->>'input_tokens')::INT,  0),
      coalesce((rec->>'output_tokens')::INT, 0),
      coalesce((rec->>'units')::INT,         1),
      v_cost,
      rec->>'app_version',
      coalesce((rec->>'recorded_at')::TIMESTAMPTZ, now())
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.batch_record_api_usage(JSONB) TO authenticated;

-- ── get_monthly_totals ────────────────────────────────────────────────────────
-- Overall spend + tier limit for the current calendar month.
CREATE OR REPLACE FUNCTION public.get_monthly_totals()
RETURNS TABLE(
  total_cost_usd   NUMERIC(10, 6),
  total_requests   BIGINT,
  monthly_limit_usd NUMERIC(10, 2),
  percentage_used  NUMERIC(5, 2),
  tier             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier  TEXT    := 'none';
  v_limit NUMERIC(10, 2) := 2.00;
BEGIN
  SELECT s.tier INTO v_tier
  FROM subscriptions s
  WHERE s.user_id = auth.uid() AND s.status IN ('active', 'trialing')
  LIMIT 1;

  SELECT tl.monthly_usd_limit INTO v_limit
  FROM tier_limits tl
  WHERE tl.tier = coalesce(v_tier, 'none');

  RETURN QUERY
  SELECT
    coalesce(SUM(u.cost_usd), 0)::NUMERIC(10,6)                                     AS total_cost_usd,
    COUNT(*)::BIGINT                                                                  AS total_requests,
    v_limit                                                                           AS monthly_limit_usd,
    LEAST(
      CASE WHEN v_limit > 0
        THEN (coalesce(SUM(u.cost_usd), 0) / v_limit * 100)::NUMERIC(5,2)
        ELSE 0
      END, 100.00
    )                                                                                 AS percentage_used,
    coalesce(v_tier, 'none')                                                          AS tier
  FROM api_usage u
  WHERE u.user_id = auth.uid()
    AND DATE_TRUNC('month', u.recorded_at) = DATE_TRUNC('month', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_totals() TO authenticated;

-- ── get_usage_summary ─────────────────────────────────────────────────────────
-- Per-provider breakdown for the current month.
CREATE OR REPLACE FUNCTION public.get_usage_summary()
RETURNS TABLE(
  provider          TEXT,
  total_cost_usd    NUMERIC(10, 6),
  total_input_tokens  BIGINT,
  total_output_tokens BIGINT,
  request_count     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.provider,
    coalesce(SUM(u.cost_usd),          0)::NUMERIC(10,6) AS total_cost_usd,
    coalesce(SUM(u.input_tokens),      0)::BIGINT         AS total_input_tokens,
    coalesce(SUM(u.output_tokens),     0)::BIGINT         AS total_output_tokens,
    COUNT(*)::BIGINT                                       AS request_count
  FROM api_usage u
  WHERE u.user_id = auth.uid()
    AND DATE_TRUNC('month', u.recorded_at) = DATE_TRUNC('month', now())
  GROUP BY u.provider
  ORDER BY SUM(u.cost_usd) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_usage_summary() TO authenticated;

-- ── get_usage_history ─────────────────────────────────────────────────────────
-- Month-by-month totals for the dashboard history chart.
CREATE OR REPLACE FUNCTION public.get_usage_history(months_back INT DEFAULT 6)
RETURNS TABLE(
  month          TEXT,
  total_cost_usd NUMERIC(10, 6),
  request_count  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', u.recorded_at), 'Mon ''YY') AS month,
    coalesce(SUM(u.cost_usd), 0)::NUMERIC(10,6)             AS total_cost_usd,
    COUNT(*)::BIGINT                                         AS request_count
  FROM api_usage u
  WHERE u.user_id = auth.uid()
    AND u.recorded_at >= DATE_TRUNC('month', now())
                       - ((months_back - 1) || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', u.recorded_at)
  ORDER BY DATE_TRUNC('month', u.recorded_at) ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_usage_history(INT) TO authenticated;

-- ── check_usage_allowed ───────────────────────────────────────────────────────
-- Desktop app calls this before expensive AI operations to enforce tier limits.
CREATE OR REPLACE FUNCTION public.check_usage_allowed(p_estimated_cost NUMERIC DEFAULT 0)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier         TEXT    := 'none';
  v_limit        NUMERIC(10,2) := 2.00;
  v_current_spend NUMERIC(10,6) := 0;
BEGIN
  SELECT s.tier INTO v_tier
  FROM subscriptions s
  WHERE s.user_id = auth.uid() AND s.status IN ('active', 'trialing')
  LIMIT 1;

  SELECT tl.monthly_usd_limit INTO v_limit
  FROM tier_limits tl
  WHERE tl.tier = coalesce(v_tier, 'none');

  SELECT coalesce(SUM(cost_usd), 0) INTO v_current_spend
  FROM api_usage
  WHERE user_id = auth.uid()
    AND DATE_TRUNC('month', recorded_at) = DATE_TRUNC('month', now());

  RETURN (v_current_spend + p_estimated_cost) < v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_usage_allowed(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_allowed(NUMERIC) TO anon;
