-- ============================================
-- MIGRATION: Creative Products (FIXED VERSION)
-- Cria estrutura sem inserir dados automaticamente
-- ============================================

-- Criar tabela creative_products se não existir
CREATE TABLE IF NOT EXISTS creative_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#007AFF',
  bg_gradient VARCHAR(255) NOT NULL DEFAULT 'from-blue-500 to-blue-600',
  icon VARCHAR(10) NOT NULL DEFAULT '📦',
  nomenclature JSONB DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices apenas se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_creative_products_user_id') THEN
    CREATE INDEX idx_creative_products_user_id ON creative_products(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_creative_products_is_active') THEN
    CREATE INDEX idx_creative_products_is_active ON creative_products(is_active);
  END IF;
END $$;

-- RLS (Row Level Security)
ALTER TABLE creative_products ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem e recriar
DROP POLICY IF EXISTS "Users can view their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can create their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can update their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON creative_products;

-- Recriar políticas
CREATE POLICY "Users can view their own products" ON creative_products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products" ON creative_products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON creative_products
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON creative_products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS update_creative_products_updated_at ON creative_products;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_creative_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
CREATE TRIGGER update_creative_products_updated_at
  BEFORE UPDATE ON creative_products
  FOR EACH ROW
  EXECUTE FUNCTION update_creative_products_updated_at();

-- Mensagem de sucesso
SELECT 'Tabela creative_products criada com sucesso!' as status;

-- NOTA: Os produtos padrão serão criados automaticamente pelo aplicativo
-- quando nenhum produto for encontrado no banco de dados.
-- 
-- Se você quiser inserir produtos manualmente para um usuário específico,
-- primeiro encontre o user_id do usuário:
-- SELECT id, email FROM auth.users;
-- 
-- Depois insira os produtos usando o user_id:
-- INSERT INTO creative_products (user_id, name, description, color, bg_gradient, icon, nomenclature)
-- VALUES 
--   ('USER_ID_AQUI', 'Memo Master', 'App de memorização e estudos inteligentes', '#007AFF', 'from-blue-500 to-blue-600', '🧠', 
--    '{"prefixo_oferta": "MM", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}'::jsonb),
--   ('USER_ID_AQUI', 'Youtasky', 'Gerenciador de tarefas para YouTubers', '#FF453A', 'from-red-500 to-red-600', '📹',
--    '{"prefixo_oferta": "YT", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}'::jsonb),
--   ('USER_ID_AQUI', 'Alma Gêmea', 'Plataforma de relacionamentos autênticos', '#FF2D92', 'from-pink-500 to-pink-600', '💖',
--    '{"prefixo_oferta": "AG", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}'::jsonb);