-- Add test_duration_minutes to question_pools for category-specific timing
ALTER TABLE public.question_pools 
  ADD COLUMN IF NOT EXISTS test_duration_minutes integer DEFAULT 30;

COMMENT ON COLUMN public.question_pools.test_duration_minutes IS 'Duration in minutes for tests from this pool';

-- Update existing pools with category-specific durations
UPDATE public.question_pools 
SET test_duration_minutes = 30 
WHERE name LIKE '%Sales%';

UPDATE public.question_pools 
SET test_duration_minutes = 25 
WHERE name LIKE '%Hostess%';

-- Also ensure certifications have proper durations (already exists but let's sync)
UPDATE public.certifications c
SET duration_minutes = p.test_duration_minutes
FROM public.question_pools p
WHERE c.question_pool_id = p.id
  AND c.duration_minutes IS NULL;

