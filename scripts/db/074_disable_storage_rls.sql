-- OPÇÃO NUCLEAR: Desabilitar completamente RLS no storage para o bucket bug-reports
-- Use apenas se as políticas não funcionarem

-- Opção 1: Desabilitar RLS para toda a tabela storage.objects
-- CUIDADO: Isso afeta TODOS os buckets, não apenas bug-reports
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar uma política super permissiva que permite TUDO
-- Esta é mais segura pois afeta apenas operações no bucket bug-reports
CREATE POLICY "Bypass all for bug-reports" ON storage.objects
  FOR ALL
  USING (bucket_id = 'bug-reports')
  WITH CHECK (bucket_id = 'bug-reports');

-- Verificar status do RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';