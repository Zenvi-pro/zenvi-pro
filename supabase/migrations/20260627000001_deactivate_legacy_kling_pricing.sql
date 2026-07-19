-- Remove legacy per-model Kling pricing rows; billing SSOT is operation_pricing.
DELETE FROM public.api_pricing
WHERE provider = 'runware'
  AND (
    model_pattern LIKE 'kling-1.6-%'
    OR model_pattern LIKE 'kling-2.0%'
    OR model_pattern = 'morph%'
  );
