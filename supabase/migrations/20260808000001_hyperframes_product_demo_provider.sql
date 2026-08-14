-- Align operation_pricing SSOT with current providers:
--   product_demo          → hyperframes
--   indexing_per_minute   → gemini
--   stock_add             → provider NULL; charge-time provider is pexels|freesound

UPDATE public.operation_pricing
SET provider = 'hyperframes',
    description = 'HyperFrames product demo render',
    updated_at = now()
WHERE operation_key = 'product_demo';

UPDATE public.operation_pricing
SET provider = 'gemini',
    description = 'Gemini embedding + Flash analyze indexing',
    updated_at = now()
WHERE operation_key = 'indexing_per_minute';

UPDATE public.operation_pricing
SET provider = NULL,
    description = 'Stock import — charge-time provider is pexels (video) or freesound (audio)',
    updated_at = now()
WHERE operation_key = 'stock_add';
