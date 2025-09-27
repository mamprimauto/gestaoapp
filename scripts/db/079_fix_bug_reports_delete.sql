-- Verificar políticas existentes para bug_reports
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'bug_reports';

-- Verificar se RLS está habilitado
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'bug_reports';

-- Opção 1: Desabilitar RLS completamente para bug_reports (mais simples)
ALTER TABLE bug_reports DISABLE ROW LEVEL SECURITY;

-- Opção 2: Se preferir manter RLS, criar política permissiva para DELETE
-- CREATE POLICY "Allow delete for all" ON bug_reports FOR DELETE USING (true);

-- Verificar novamente as políticas
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'bug_reports';