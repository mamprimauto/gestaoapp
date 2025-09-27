-- Cleanup fake dailys with fictitious data
-- This script removes dailys that appear to have fake/test data

-- Delete dailys with exactly 30 minutes duration (likely hardcoded test data)
-- But preserve dailys that have actual timer data (start_time and end_time properly set)
DELETE FROM dailys
WHERE duration_minutes = 30
  AND (
    -- Remove if times look suspicious (all at same exact time or null)
    (start_time IS NULL AND end_time IS NULL)
    OR
    -- Remove if the attendance is empty (no real participants)
    (attendance = '[]'::jsonb OR attendance IS NULL)
    OR
    -- Remove if created but never actually started (no timer_start_time and is not active)
    (timer_start_time IS NULL AND is_active = false AND start_time IS NULL)
  );

-- Optional: Also remove dailys that were never completed and are older than 7 days
DELETE FROM dailys
WHERE duration_minutes IS NULL
  AND end_time IS NULL
  AND is_active = false
  AND created_at < NOW() - INTERVAL '7 days';

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleaned up fictitious daily records';
END $$;