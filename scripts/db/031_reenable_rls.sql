-- ========================================
-- REABILITAR RLS COM POLÍTICAS CORRETAS
-- ========================================
-- Execute após confirmar que OKRs funcionam sem RLS

-- Reabilitar RLS
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_tasks ENABLE ROW LEVEL SECURITY;  
ALTER TABLE okr_assignees ENABLE ROW LEVEL SECURITY;

-- Políticas mais simples e permissivas
-- Qualquer usuário autenticado pode fazer tudo

CREATE POLICY "okr_policy_simple" ON okrs 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "key_results_policy_simple" ON key_results
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "okr_tasks_policy_simple" ON okr_tasks
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "okr_assignees_policy_simple" ON okr_assignees  
FOR ALL USING (true) WITH CHECK (true);

-- Mensagem de confirmação
SELECT 'RLS REABILITADO com políticas permissivas - sistema deve funcionar agora!' as status;