-- ========================================
-- OKR Visibility System - Department-based access control
-- ========================================

-- Add visibility fields to key_results table
ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS visibility_level text DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS allowed_departments text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by text;

-- Update existing key_results to have default visibility settings
UPDATE key_results 
SET 
  visibility_level = 'custom',
  allowed_departments = '{}',
  created_by = (
    SELECT created_by 
    FROM okrs 
    WHERE okrs.id = key_results.okr_id 
    LIMIT 1
  )
WHERE visibility_level IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_key_results_visibility ON key_results(visibility_level);
CREATE INDEX IF NOT EXISTS idx_key_results_departments ON key_results USING GIN(allowed_departments);
CREATE INDEX IF NOT EXISTS idx_key_results_created_by ON key_results(created_by);

-- Add comment for documentation
COMMENT ON COLUMN key_results.visibility_level IS 'Always "custom" for checkbox-based department visibility';
COMMENT ON COLUMN key_results.allowed_departments IS 'Array of department values that can access this key result';
COMMENT ON COLUMN key_results.created_by IS 'User ID of the key result creator';