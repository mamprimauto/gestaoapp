-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE (APENAS PARA TESTE)
-- ============================================

-- Opção 1: Desabilitar RLS completamente (NÃO RECOMENDADO para produção)
ALTER TABLE creative_products DISABLE ROW LEVEL SECURITY;

-- Após testar, reabilite com:
-- ALTER TABLE creative_products ENABLE ROW LEVEL SECURITY;

-- OU

-- Opção 2: Criar política super permissiva para usuários autenticados
-- Primeiro remover políticas existentes
DROP POLICY IF EXISTS "Users can view their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can create their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can update their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON creative_products;

-- Criar política que permite tudo para usuários autenticados
CREATE POLICY "Allow all for authenticated users" ON creative_products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verificar status
SELECT 
  relname as table,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'creative_products';