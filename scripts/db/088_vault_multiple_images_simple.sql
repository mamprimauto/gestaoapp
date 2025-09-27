-- Migração simples para suportar múltiplas imagens no vault
-- Apenas adiciona nova coluna sem remover a existente

-- Adicionar nova coluna para múltiplas imagens
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Comentário para documentação
COMMENT ON COLUMN vault_items.images IS 'Array de URLs das imagens do item do vault';