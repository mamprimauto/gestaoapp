-- Make user_id nullable since dailys are now collaborative
ALTER TABLE dailys ALTER COLUMN user_id DROP NOT NULL;

-- Update existing dailys to ensure they have daily_type
UPDATE dailys SET daily_type = 'copy_gestor' WHERE daily_type IS NULL;