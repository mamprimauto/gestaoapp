-- ============================================
-- NOVA ABORDAGEM: Produtos Compartilhados
-- Sem RLS complexo, similar à tabela tasks
-- ============================================

-- Dropar tabela antiga se existir
DROP TABLE IF EXISTS creative_products CASCADE;

-- Criar nova tabela de produtos (estrutura simplificada)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#007AFF',
  bg_gradient VARCHAR(255) DEFAULT 'from-blue-500 to-blue-600',
  icon VARCHAR(10) DEFAULT '📦',
  nomenclature JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id) -- Apenas para registro, não para RLS
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- IMPORTANTE: Sem RLS para permitir colaboração
-- Todos os usuários autenticados podem ver e gerenciar produtos
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Garantir que a tabela seja pública para usuários autenticados
GRANT ALL ON products TO authenticated;
GRANT USAGE ON SEQUENCE products_id_seq TO authenticated;

-- Mensagem de sucesso
SELECT 'Tabela products criada com sucesso (sem RLS)!' as status;