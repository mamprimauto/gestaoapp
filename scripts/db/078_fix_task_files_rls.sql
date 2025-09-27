-- Adicionar política para permitir uploads na pasta bug-reports dentro do bucket task-files

-- 1. Ver políticas existentes do bucket task-files
SELECT * FROM storage.policies WHERE bucket_id = 'task-files';

-- 2. Criar política específica para a pasta bug-reports
-- Permitir que qualquer usuário (autenticado ou não) faça upload na pasta bug-reports
CREATE POLICY "Allow bug report uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'task-files' AND 
    (path_tokens[1] = 'bug-reports' OR auth.uid() IS NOT NULL)
  );

-- 3. Permitir visualização pública de arquivos na pasta bug-reports
CREATE POLICY "Public access to bug reports" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'task-files' AND 
    path_tokens[1] = 'bug-reports'
  );

-- 4. Alternativa mais simples - permitir upload público em todo o bucket task-files
-- Use apenas se a solução acima não funcionar
-- CREATE POLICY "Allow public uploads to task-files" ON storage.objects
--   FOR INSERT
--   WITH CHECK (bucket_id = 'task-files');

-- 5. Verificar se o bucket está público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'task-files';