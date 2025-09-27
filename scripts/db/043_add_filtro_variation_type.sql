-- Add 'filtro' to variation_type options
-- Migration: 043_add_filtro_variation_type.sql

-- Remove existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_variation_type_check;

-- Add new constraint including 'filtro'
ALTER TABLE tasks ADD CONSTRAINT tasks_variation_type_check 
  CHECK (variation_type IN ('hook', 'body', 'clickbait', 'edicao', 'trilha', 'avatar', 'filtro'));

-- Update comment
COMMENT ON COLUMN tasks.variation_type IS 'Tipo de variação: hook, body, clickbait, edicao, trilha, avatar, filtro. NULL para criativos principais.';