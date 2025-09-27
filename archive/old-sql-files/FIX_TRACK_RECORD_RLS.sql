-- ========================================
-- FIX: Correção das políticas RLS para track_records
-- Problema: Política de INSERT estava referenciando o registro antes de ser criado
-- ========================================

-- 1. Remover políticas antigas problemáticas
DROP POLICY IF EXISTS "Organization members can create track records" ON track_records;
DROP POLICY IF EXISTS "Organization members can update track records" ON track_records;
DROP POLICY IF EXISTS "Organization members can view track records" ON track_records;

-- 2. Recriar política de SELECT (visualização)
CREATE POLICY "Organization members can view track records"
  ON track_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = track_records.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- 3. Recriar política de INSERT corrigida
-- Agora verifica se o usuário é membro da organização sendo inserida
CREATE POLICY "Organization members can create track records"
  ON track_records FOR INSERT
  WITH CHECK (
    -- Verificar se o usuário que está criando é o mesmo do created_by
    created_by = auth.uid() 
    AND
    -- Verificar se o usuário é membro da organização
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id  -- Usa o valor sendo inserido
      AND om.user_id = auth.uid()
    )
  );

-- 4. Recriar política de UPDATE corrigida
CREATE POLICY "Organization members can update track records"
  ON track_records FOR UPDATE
  USING (
    -- Pode ver o registro atual
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = track_records.organization_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Verificar permissão para o novo valor
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id  -- Usa o novo valor
      AND om.user_id = auth.uid()
    )
  );

-- 5. Adicionar política de DELETE (estava faltando)
CREATE POLICY "Organization admins can delete track records"
  ON track_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = track_records.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'  -- Apenas admins podem deletar
    )
  );

-- ========================================
-- Verificar se as políticas foram aplicadas corretamente
-- ========================================

-- Listar todas as políticas da tabela track_records
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
WHERE tablename = 'track_records'
ORDER BY policyname;

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Verifique se não há erros
-- 3. Teste criar um novo teste A/B na aplicação
-- ========================================