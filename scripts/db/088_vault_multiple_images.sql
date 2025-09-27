-- Migração para suportar múltiplas imagens no vault
-- Altera o campo image_url para images (array de strings)

-- Renomear a coluna existente para backup
ALTER TABLE vault_items RENAME COLUMN image_url TO image_url_backup;

-- Adicionar nova coluna para múltiplas imagens
ALTER TABLE vault_items ADD COLUMN images TEXT[] DEFAULT '{}';

-- Migrar dados existentes (converter image_url única para array)
UPDATE vault_items 
SET images = CASE 
  WHEN image_url_backup IS NOT NULL AND image_url_backup != '' 
  THEN ARRAY[image_url_backup]
  ELSE '{}'
END;

-- Remover coluna de backup após migração
ALTER TABLE vault_items DROP COLUMN image_url_backup;

-- Comentário para documentação
COMMENT ON COLUMN vault_items.images IS 'Array de URLs das imagens do item do vault';