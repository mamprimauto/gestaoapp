-- Script para corrigir o bucket de storage do Swipe File Comments
-- Execute este script no SQL Editor do Supabase

-- 1. Garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true,  -- IMPORTANTE: bucket público
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 2. Remover todas as políticas antigas
DROP POLICY IF EXISTS "Allow authenticated uploads swipe comments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing swipe comments" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own uploads swipe comments" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view swipe comments" ON storage.objects;

-- 3. Criar políticas corretas
-- Política para permitir upload (usuários autenticados)
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'swipe-file-comments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para visualização pública
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'swipe-file-comments');

-- Política para permitir que usuários deletem suas próprias imagens
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'swipe-file-comments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Verificar configuração
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'swipe-file-comments';

-- 5. Verificar políticas
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
  AND schemaname = 'storage'
  AND policyname LIKE '%images%'
ORDER BY policyname;