-- REMOVER TODAS AS POLÍTICAS RESTRITIVAS DO BUCKET bug-reports
-- Como é um projeto interno, vamos deixar completamente aberto

-- 1. Primeiro, remover todas as políticas existentes do bucket
DROP POLICY IF EXISTS "Allow public uploads to bug-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to bug-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to bug-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own bug-reports" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload bug report screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view bug report screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own bug report screenshots" ON storage.objects;

-- 2. Criar políticas completamente abertas (sem restrições)
-- Permitir TUDO para TODOS no bucket bug-reports

-- Política para SELECT (visualizar)
CREATE POLICY "Open access to bug-reports" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bug-reports');

-- Política para INSERT (upload)
CREATE POLICY "Open upload to bug-reports" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'bug-reports');

-- Política para UPDATE
CREATE POLICY "Open update to bug-reports" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'bug-reports');

-- Política para DELETE
CREATE POLICY "Open delete to bug-reports" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'bug-reports');

-- 3. Garantir que o bucket está público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'bug-reports';

-- 4. Verificar se funcionou
SELECT * FROM storage.buckets WHERE id = 'bug-reports';
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%bug-reports%';