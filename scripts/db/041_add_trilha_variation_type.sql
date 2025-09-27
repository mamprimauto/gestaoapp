-- Add 'trilha' to variation_type options
-- Migration: 041_add_trilha_variation_type.sql

-- Remove existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_variation_type_check;

-- Add new constraint including 'trilha'
ALTER TABLE tasks ADD CONSTRAINT tasks_variation_type_check 
  CHECK (variation_type IN ('hook', 'body', 'clickbait', 'edicao', 'trilha'));

-- Update comment
COMMENT ON COLUMN tasks.variation_type IS 'Tipo de variação: hook, body, clickbait, edicao, trilha. NULL para criativos principais.';