-- Adicionar campos para sistema de variações de criativos
-- Permite que criativos tenham variações (Hook, Body, Clickbait)

-- Adicionar colunas para variações
ALTER TABLE tasks 
ADD COLUMN parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN variation_type TEXT CHECK (variation_type IN ('hook', 'body', 'clickbait'));

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_variation_type ON tasks(variation_type);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_variation ON tasks(parent_id, variation_type);

-- Comentários para documentação
COMMENT ON COLUMN tasks.parent_id IS 'ID do criativo principal para variações. NULL para criativos principais.';
COMMENT ON COLUMN tasks.variation_type IS 'Tipo de variação: hook, body, clickbait. NULL para criativos principais.';

-- RLS: Variações seguem a mesma política do criativo principal
-- (As políticas existentes já cobrem isso através da herança)