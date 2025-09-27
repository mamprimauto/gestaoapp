-- Adicionar 'edicao' como tipo de variação válido
-- Corrige problema onde reedições não podem ser salvas no banco

-- Remover constraint existente
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_variation_type_check;

-- Adicionar nova constraint incluindo 'edicao'
ALTER TABLE tasks ADD CONSTRAINT tasks_variation_type_check 
  CHECK (variation_type IN ('hook', 'body', 'clickbait', 'edicao'));

-- Comentário atualizado
COMMENT ON COLUMN tasks.variation_type IS 'Tipo de variação: hook, body, clickbait, edicao. NULL para criativos principais.';