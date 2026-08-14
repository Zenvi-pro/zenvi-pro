-- Freeform HyperFrames motion-graphics renders (compose / custom).
-- Distinct from product_demo (URL multi-segment demos).

INSERT INTO public.operation_pricing (
  operation_key, points_per_unit, unit_type, category, provider, description
) VALUES
  (
    'motion_graphics',
    3,
    'flat',
    'other',
    'hyperframes',
    'HyperFrames freeform motion graphic render (compose or custom)'
  )
ON CONFLICT (operation_key) DO UPDATE SET
  points_per_unit = EXCLUDED.points_per_unit,
  unit_type       = EXCLUDED.unit_type,
  category        = EXCLUDED.category,
  provider        = EXCLUDED.provider,
  description     = EXCLUDED.description,
  updated_at      = now();
