-- Script completo para corrigir problemas de storage no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Desabilitar RLS temporariamente para debug
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que o bucket existe e está público
INSERT INTO storage.buckets (id, name, public, file_size_limit, avif_autodetection, allowed_mime_types)
VALUES (
  'task-files', 
  'task-files', 
  true, -- PÚBLICO
  2147483648, -- 2GB
  false,
  NULL -- Aceita todos os tipos MIME
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 2147483648,
  allowed_mime_types = NULL;

-- 3. Re-habilitar RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas antigas
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view task files" ON storage.objects;

-- 5. Criar política simples de leitura pública (SEM RESTRIÇÕES)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-files');

-- 6. Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-files' 
  AND auth.uid() IS NOT NULL
);

-- 7. Permitir update para usuários autenticados
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-files'
  AND auth.uid() IS NOT NULL
);

-- 8. Permitir delete para usuários autenticados
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-files'
  AND auth.uid() IS NOT NULL
);

-- 9. Verificar o resultado
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task-files';

-- 10. Listar políticas aplicadas
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
WHERE tablename = 'objects'
AND schemaname = 'storage';

-- 11. Verificar se há arquivos no bucket (para debug)
SELECT 
  COUNT(*) as total_files,
  MAX(created_at) as ultimo_upload
FROM storage.objects
WHERE bucket_id = 'task-files';