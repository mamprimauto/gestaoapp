-- Script para configurar políticas RLS do bucket swipe-file-comments
-- Execute este script no SQL Editor do Supabase

-- 1. Garantir que o bucket existe e está público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true,  -- PÚBLICO: permite visualização sem autenticação
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 2. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem visualizar imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar próprias imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar próprias imagens" ON storage.objects;

-- 3. Criar política para permitir upload para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'swipe-file-comments' 
  AND auth.role() = 'authenticated'
);

-- 4. Criar política para permitir visualização pública (já que o bucket é público)
CREATE POLICY "Todos podem visualizar imagens"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'swipe-file-comments');

-- 5. Criar política para permitir que usuários deletem suas próprias imagens
CREATE POLICY "Usuários podem deletar próprias imagens"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'swipe-file-comments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Criar política para permitir que usuários atualizem suas próprias imagens
CREATE POLICY "Usuários podem atualizar próprias imagens"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'swipe-file-comments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'swipe-file-comments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 7. Verificar políticas criadas
SELECT 
  'Políticas RLS configuradas!' as mensagem,
  count(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%swipe-file-comments%' 
     OR policyname LIKE '%imagens%'
     OR policyname LIKE '%upload%';

-- NOTA: Se as políticas não funcionarem, você pode também tentar desabilitar RLS para o bucket:
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- MAS ISSO NÃO É RECOMENDADO POR QUESTÕES DE SEGURANÇA