-- Script CORRIGIDO para configurar o bucket de storage do Swipe File Comments
-- Execute este script no SQL Editor do Supabase

-- 1. Garantir que o bucket existe e está configurado corretamente
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true,  -- IMPORTANTE: bucket público para visualização
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']::text[];

-- 2. Remover políticas antigas se existirem (ignorar erros se não existirem)
DO $$ 
BEGIN
  -- Tentar remover políticas antigas
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated uploads swipe comments" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow public viewing swipe comments" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow users to delete own uploads swipe comments" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view swipe comments" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "swipe_comments_auth_upload" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "swipe_comments_public_view" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "swipe_comments_auth_update" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "swipe_comments_auth_delete" ON storage.objects';
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora erros se as políticas não existirem
    NULL;
END $$;

-- 3. Criar políticas SIMPLES e PERMISSIVAS
-- Política 1: Qualquer usuário autenticado pode fazer upload
CREATE POLICY "swipe_comments_auth_upload_v2"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'swipe-file-comments'
);

-- Política 2: Qualquer pessoa pode visualizar (bucket público)
CREATE POLICY "swipe_comments_public_view_v2"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'swipe-file-comments'
);

-- Política 3: Usuários podem atualizar seus próprios arquivos
CREATE POLICY "swipe_comments_auth_update_v2"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'swipe-file-comments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'swipe-file-comments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política 4: Usuários podem deletar seus próprios arquivos
CREATE POLICY "swipe_comments_auth_delete_v2"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'swipe-file-comments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Garantir que o RLS está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Verificar se as políticas foram criadas
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%swipe_comments%'
ORDER BY policyname;

-- 6. Verificar configuração do bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'swipe-file-comments';

-- 7. Mensagem de conclusão
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===================================';
  RAISE NOTICE 'Bucket configurado com sucesso!';
  RAISE NOTICE '===================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas criadas:';
  RAISE NOTICE '  ✓ swipe_comments_auth_upload_v2: Upload para autenticados';
  RAISE NOTICE '  ✓ swipe_comments_public_view_v2: Visualização pública';
  RAISE NOTICE '  ✓ swipe_comments_auth_update_v2: Atualização própria';
  RAISE NOTICE '  ✓ swipe_comments_auth_delete_v2: Deleção própria';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '  1. Faça logout e login novamente no app';
  RAISE NOTICE '  2. Teste o upload de imagem nos comentários';
  RAISE NOTICE '';
END $$;