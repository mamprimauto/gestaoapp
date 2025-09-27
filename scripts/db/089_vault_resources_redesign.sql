-- Migração para reformular o vault como centro de recursos
-- Adiciona novos campos e torna campos de senha opcionais

-- Adicionar novos campos para diferentes tipos de recursos
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS version VARCHAR(50);
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS code_language VARCHAR(50);
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- Tornar campos de criptografia opcionais (para recursos que não precisam)
ALTER TABLE vault_items ALTER COLUMN encrypted_password DROP NOT NULL;
ALTER TABLE vault_items ALTER COLUMN salt DROP NOT NULL;  
ALTER TABLE vault_items ALTER COLUMN iv DROP NOT NULL;

-- Tornar campos de segurança opcionais e com valores padrão
ALTER TABLE vault_items ALTER COLUMN strength_score SET DEFAULT 0;
ALTER TABLE vault_items ALTER COLUMN has_breach SET DEFAULT false;
ALTER TABLE vault_items ALTER COLUMN breach_count SET DEFAULT 0;

-- Atualizar categoria padrão
ALTER TABLE vault_items ALTER COLUMN category SET DEFAULT 'note';

-- Comentários para documentação
COMMENT ON COLUMN vault_items.description IS 'Descrição detalhada do recurso';
COMMENT ON COLUMN vault_items.file_path IS 'Caminho do arquivo para documentos e mídia';
COMMENT ON COLUMN vault_items.file_type IS 'MIME type do arquivo';
COMMENT ON COLUMN vault_items.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN vault_items.tags IS 'Tags para organização e busca';
COMMENT ON COLUMN vault_items.version IS 'Versão do documento ou template';
COMMENT ON COLUMN vault_items.code_language IS 'Linguagem de programação para snippets';
COMMENT ON COLUMN vault_items.contact_info IS 'Informações de contato em formato JSON';

-- Criar índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
CREATE INDEX IF NOT EXISTS idx_vault_items_tags ON vault_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_vault_items_file_type ON vault_items(file_type);
CREATE INDEX IF NOT EXISTS idx_vault_items_favorite ON vault_items(favorite) WHERE favorite = true;