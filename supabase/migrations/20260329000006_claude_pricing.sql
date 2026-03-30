-- Update Anthropic pricing to current Claude 4.x models (March 2026)
INSERT INTO public.api_pricing (provider, model_pattern, input_cost_per_million, output_cost_per_million) VALUES
  ('anthropic', 'claude-opus-4-6%',   5.00,  25.00),
  ('anthropic', 'claude-sonnet-4-6%', 3.00,  15.00),
  ('anthropic', 'claude-haiku-4-5%',  1.00,   5.00)
ON CONFLICT (provider, model_pattern) DO UPDATE
  SET input_cost_per_million  = EXCLUDED.input_cost_per_million,
      output_cost_per_million = EXCLUDED.output_cost_per_million;
