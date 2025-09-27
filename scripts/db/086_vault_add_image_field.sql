-- Adicionar campo de imagem ao sistema de vault
-- Execute este script no Supabase SQL Editor

-- Adicionar campo image_url à tabela vault_items
ALTER TABLE vault_items 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Remover constraint que impede senhas vazias (para permitir notas/documentos sem senha)
ALTER TABLE vault_items 
  DROP CONSTRAINT IF EXISTS vault_items_encrypted_password_not_empty;

-- Comentário explicativo
COMMENT ON COLUMN vault_items.image_url IS 'URL da imagem associada ao item do vault';

-- Verificar se a coluna foi adicionada
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'vault_items' 
  AND column_name = 'image_url';