-- Script simplificado para corrigir storage (sem precisar de permissões de owner)
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o bucket existe e suas configurações atuais
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'task-files';

-- 2. Tentar atualizar o bucket para público (se você tiver permissão)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'task-files';

-- 3. Verificar políticas existentes
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

-- 4. Verificar se há arquivos no bucket
SELECT 
  id,
  name,
  bucket_id,
  created_at,
  updated_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'task-files'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Teste de inserção direta (para verificar se o upload está funcionando)
-- Descomente e ajuste o user_id se quiser testar
-- INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at)
-- VALUES ('task-files', 'test-file.txt', 'seu-user-id-aqui', NOW(), NOW());

-- 6. Verificar permissões do usuário atual
SELECT current_user, session_user;

-- 7. Verificar se RLS está ativo
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename IN ('objects', 'buckets');