-- Add daily_type column to dailys table
ALTER TABLE dailys ADD COLUMN daily_type VARCHAR(50) DEFAULT 'copy_gestor';

-- Update existing records to default type
UPDATE dailys SET daily_type = 'copy_gestor' WHERE daily_type IS NULL;

-- Add check constraint for valid daily types
ALTER TABLE dailys ADD CONSTRAINT daily_type_check CHECK (daily_type IN ('copy_gestor', 'editores'));