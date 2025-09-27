-- Test script to verify swipe_files table is working correctly
-- Run this after creating the table to test functionality

-- First, check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'swipe_files'
) as table_exists;

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'swipe_files'
ORDER BY ordinal_position;

-- Test insert (this will create a test record)
INSERT INTO public.swipe_files (
  name,
  niche,
  ads_count,
  link,
  is_active
) VALUES (
  'VSL Emagrecimento 2024',
  'Emagrecimento',
  150,
  'https://example.com/vsl-emagrecimento',
  true
) RETURNING *;

-- Query all records
SELECT * FROM public.swipe_files;

-- Test update
UPDATE public.swipe_files 
SET ads_count = 200 
WHERE name = 'VSL Emagrecimento 2024'
RETURNING *;

-- Clean up test data (optional - comment out if you want to keep test data)
-- DELETE FROM public.swipe_files WHERE name = 'VSL Emagrecimento 2024';