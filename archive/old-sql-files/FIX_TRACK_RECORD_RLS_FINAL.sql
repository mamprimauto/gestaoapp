-- ========================================
-- SOLUÇÃO DEFINITIVA: Correção completa das políticas RLS para track_records
-- ========================================

-- 1. PRIMEIRO: Desabilitar RLS temporariamente para limpar tudo
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Organization members can view track records" ON track_records;
DROP POLICY IF EXISTS "Organization members can create track records" ON track_records;
DROP POLICY IF EXISTS "Organization members can update track records" ON track_records;
DROP POLICY IF EXISTS "Organization admins can delete track records" ON track_records;
DROP POLICY IF EXISTS "Organization members can manage variations" ON track_record_variations;
DROP POLICY IF EXISTS "Organization members can manage KPIs" ON track_record_kpis;

-- 3. Reabilitar RLS
ALTER TABLE track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLÍTICAS SIMPLES E FUNCIONAIS
-- ========================================

-- 4. Política de SELECT para track_records
CREATE POLICY "view_track_records"
  ON track_records FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = track_records.organization_id
    )
  );

-- 5. Política de INSERT SIMPLIFICADA
-- Permite inserir se o usuário é membro da organização
CREATE POLICY "insert_track_records"
  ON track_records FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND 
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = track_records.organization_id
    )
  );

-- 6. Política de UPDATE
CREATE POLICY "update_track_records"
  ON track_records FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = track_records.organization_id
    )
  );

-- 7. Política de DELETE (apenas admins)
CREATE POLICY "delete_track_records"
  ON track_records FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = track_records.organization_id
      AND role = 'admin'
    )
  );

-- ========================================
-- Políticas para track_record_variations
-- ========================================

-- 8. Política unificada para variations
CREATE POLICY "manage_variations"
  ON track_record_variations FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM track_records tr
      JOIN organization_members om ON om.organization_id = tr.organization_id
      WHERE tr.id = track_record_variations.track_record_id
      AND om.user_id = auth.uid()
    )
  );

-- ========================================
-- Políticas para track_record_kpis
-- ========================================

-- 9. Política unificada para KPIs
CREATE POLICY "manage_kpis"
  ON track_record_kpis FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM track_record_variations trv
      JOIN track_records tr ON tr.id = trv.track_record_id
      JOIN organization_members om ON om.organization_id = tr.organization_id
      WHERE trv.id = track_record_kpis.variation_id
      AND om.user_id = auth.uid()
    )
  );

-- ========================================
-- ALTERNATIVA: Se ainda não funcionar, use esta versão SUPER SIMPLES
-- ========================================
/*
-- Descomente se a versão acima não funcionar

ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated" ON track_records;
DROP POLICY IF EXISTS "allow_authenticated" ON track_record_variations;
DROP POLICY IF EXISTS "allow_authenticated" ON track_record_kpis;

ALTER TABLE track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis ENABLE ROW LEVEL SECURITY;

-- Política mais permissiva apenas para usuários autenticados
CREATE POLICY "allow_authenticated"
  ON track_records FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "allow_authenticated"
  ON track_record_variations FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated"
  ON track_record_kpis FOR ALL
  USING (auth.uid() IS NOT NULL);
*/

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Verificar políticas aplicadas
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('track_records', 'track_record_variations', 'track_record_kpis')
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('track_records', 'track_record_variations', 'track_record_kpis');

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute este script completo no Supabase SQL Editor
-- 2. Se ainda der erro, descomente a seção "ALTERNATIVA" e execute novamente
-- 3. Teste criar um novo teste A/B
-- ========================================