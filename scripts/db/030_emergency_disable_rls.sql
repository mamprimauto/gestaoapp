-- ========================================
-- EMERGÊNCIA: DESABILITAR RLS TEMPORARIAMENTE
-- ========================================
-- Use apenas para teste - depois vamos reabilitar com políticas corretas

-- Desabilitar RLS em todas as tabelas OKR
ALTER TABLE okrs DISABLE ROW LEVEL SECURITY;
ALTER TABLE key_results DISABLE ROW LEVEL SECURITY;  
ALTER TABLE okr_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE okr_assignees DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Allow all for authenticated users - OKRs" ON okrs;
DROP POLICY IF EXISTS "Allow all for authenticated users - Key Results" ON key_results;
DROP POLICY IF EXISTS "Allow all for authenticated users - Tasks" ON okr_tasks;
DROP POLICY IF EXISTS "Allow all for authenticated users - Assignees" ON okr_assignees;

DROP POLICY IF EXISTS "Users can do everything with OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can do everything with key results" ON key_results;
DROP POLICY IF EXISTS "Users can do everything with tasks" ON okr_tasks;
DROP POLICY IF EXISTS "Users can do everything with assignees" ON okr_assignees;

-- Mensagem de confirmação
SELECT 'RLS DESABILITADO! Agora teste criar OKRs - eles devem funcionar.' as status;
SELECT 'IMPORTANTE: Depois que testar, execute 031_reenable_rls.sql para reabilitar segurança.' as warning;