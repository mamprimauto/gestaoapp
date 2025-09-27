-- ============================================
-- MIGRATION: Creative Products
-- Tabela para armazenar produtos de criativos
-- ============================================

-- Criar tabela creative_products
CREATE TABLE IF NOT EXISTS creative_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#007AFF', -- Hex color
  bg_gradient VARCHAR(255) NOT NULL DEFAULT 'from-blue-500 to-blue-600',
  icon VARCHAR(10) NOT NULL DEFAULT '📦', -- Emoji
  nomenclature JSONB DEFAULT NULL, -- Configurações de nomenclatura
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_creative_products_user_id ON creative_products(user_id);
CREATE INDEX idx_creative_products_is_active ON creative_products(is_active);

-- RLS (Row Level Security)
ALTER TABLE creative_products ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios produtos
CREATE POLICY "Users can view their own products" ON creative_products
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários podem criar seus próprios produtos
CREATE POLICY "Users can create their own products" ON creative_products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios produtos
CREATE POLICY "Users can update their own products" ON creative_products
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios produtos
CREATE POLICY "Users can delete their own products" ON creative_products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_creative_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creative_products_updated_at
  BEFORE UPDATE ON creative_products
  FOR EACH ROW
  EXECUTE FUNCTION update_creative_products_updated_at();

-- Migrar produtos existentes (hardcoded) para o banco
-- Isso será feito apenas uma vez para cada usuário
-- Os IDs são gerados de forma determinística baseados no nome do produto
-- para manter compatibilidade com tarefas existentes

-- Comentário: Para migrar os produtos existentes, execute o seguinte após criar a tabela:
-- INSERT INTO creative_products (id, user_id, name, description, color, bg_gradient, icon, nomenclature)
-- SELECT
--   uuid_generate_v5(uuid_ns_url(), name),
--   auth.uid(),
--   name,
--   description,
--   color,
--   bg_gradient,
--   icon,
--   nomenclature
-- FROM (VALUES
--   ('memo-master', 'Memo Master', 'App de memorização e estudos inteligentes', '#007AFF', 'from-blue-500 to-blue-600', '🧠', 
--    '{"prefixo_oferta": "MM", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}'::jsonb),
--   ('youtasky', 'Youtasky', 'Gerenciador de tarefas para YouTubers', '#FF453A', 'from-red-500 to-red-600', '📹',
--    '{"prefixo_oferta": "YT", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}'::jsonb),
--   ('alma-gemea', 'Alma Gêmea', 'Plataforma de relacionamentos autênticos', '#FF2D92', 'from-pink-500 to-pink-600', '💖',
--    '{"prefixo_oferta": "AG", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}'::jsonb)
-- ) AS products(legacy_id, name, description, color, bg_gradient, icon, nomenclature)
-- WHERE NOT EXISTS (
--   SELECT 1 FROM creative_products WHERE user_id = auth.uid()
-- );