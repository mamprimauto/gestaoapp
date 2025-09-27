-- Garantir que o bucket task-files está público
-- Este script deve ser executado no Supabase SQL Editor

-- 1. Verificar se o bucket existe e criar se necessário
INSERT INTO storage.buckets (id, name, public, file_size_limit, avif_autodetection)
VALUES ('task-files', 'task-files', true, 2147483648, false) -- 2GB limit
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2147483648;

-- 2. Garantir política de leitura pública para o bucket
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'task-files');

-- 3. Garantir política de upload autenticado
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-files' 
  AND auth.uid() IS NOT NULL
);

-- 4. Permitir que usuários deletem seus próprios arquivos
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-files'
  AND auth.uid() IS NOT NULL
);

-- 5. Permitir update (para upsert funcionar)
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-files'
  AND auth.uid() IS NOT NULL
);

-- Verificar se as políticas foram aplicadas
SELECT * FROM storage.buckets WHERE id = 'task-files';