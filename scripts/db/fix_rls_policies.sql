-- ============================================
-- FIX RLS POLICIES para creative_products
-- ============================================

-- Primeiro, remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can create their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can update their own products" ON creative_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON creative_products;

-- Recriar políticas com verificação correta
-- Política para SELECT (visualizar)
CREATE POLICY "Users can view their own products" ON creative_products
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para INSERT (criar) - CORRIGIDA
CREATE POLICY "Users can create their own products" ON creative_products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE (atualizar)
CREATE POLICY "Users can update their own products" ON creative_products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para DELETE (excluir)
CREATE POLICY "Users can delete their own products" ON creative_products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verificar se RLS está habilitado
ALTER TABLE creative_products ENABLE ROW LEVEL SECURITY;

-- Teste: verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'creative_products';

-- Se ainda houver problemas, você pode temporariamente criar uma política mais permissiva:
-- ATENÇÃO: Só use isso para teste, depois volte às políticas corretas
-- DROP POLICY IF EXISTS "Enable all for authenticated users" ON creative_products;
-- CREATE POLICY "Enable all for authenticated users" ON creative_products
--   FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');