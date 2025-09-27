-- ========================================
-- CORREÇÃO EMERGENCIAL - AUTENTICAÇÃO OKR
-- ========================================
-- Este script resolve o erro 401 Unauthorized
-- simplificando temporariamente as políticas RLS

-- 1. Verificar se as tabelas existem
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'okrs') THEN
        RAISE NOTICE 'ERRO: Tabelas OKR não existem. Execute primeiro: 028_okr_system_reset.sql';
    END IF;
END $$;

-- 2. Remover políticas existentes
DROP POLICY IF EXISTS "Users can do everything with OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can do everything with key results" ON key_results;
DROP POLICY IF EXISTS "Users can do everything with tasks" ON okr_tasks;
DROP POLICY IF EXISTS "Users can do everything with assignees" ON okr_assignees;

-- 3. Verificar se RLS está habilitado
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_assignees ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas mais permissivas para debug
-- Estas políticas permitem qualquer operação para usuários autenticados

CREATE POLICY "Allow all for authenticated users - OKRs"
  ON okrs FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users - Key Results"
  ON key_results FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users - Tasks"
  ON okr_tasks FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users - Assignees"
  ON okr_assignees FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Função para debug de autenticação
CREATE OR REPLACE FUNCTION debug_auth_status()
RETURNS TABLE(
  user_id UUID,
  user_role TEXT,
  is_authenticated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    auth.role() as user_role,
    (auth.role() = 'authenticated') as is_authenticated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant para function
GRANT EXECUTE ON FUNCTION debug_auth_status() TO authenticated;

-- ========================================
-- TESTE DE VERIFICAÇÃO
-- ========================================
-- Execute esta query para testar se a auth está funcionando:
-- SELECT * FROM debug_auth_status();
-- 
-- Resultado esperado se logado:
-- user_id: [algum UUID]
-- user_role: authenticated  
-- is_authenticated: true
--
-- Se não logado:
-- user_id: null
-- user_role: anon
-- is_authenticated: false

-- ========================================
-- INSTRUCÕES DE TESTE
-- ========================================
-- 1. Execute este SQL no Supabase Dashboard
-- 2. Vá para a aplicação e tente criar um OKR
-- 3. Se ainda der 401:
--    - Verifique no console: "Criando OKR para usuário: [id]"
--    - Se não aparecer, faça logout/login
--    - Execute: SELECT * FROM debug_auth_status();
-- 4. Se der erro de token inválido:
--    - Limpe o localStorage
--    - Faça logout/login novamente

SELECT 'Políticas RLS atualizadas com sucesso! Teste criar um OKR agora.' as status;