-- Criar bucket para comentários do Swipe File
-- IMPORTANTE: Este script deve ser executado no SQL Editor do Supabase

-- Inserir o bucket na tabela storage.buckets
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('swipe-file-comments', 'swipe-file-comments', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET public = true,
    updated_at = NOW();

-- Criar políticas para o bucket
-- Política de upload: usuários autenticados podem fazer upload
CREATE POLICY "Allow authenticated uploads swipe comments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'swipe-file-comments');

-- Política de visualização: todos podem ver as imagens
CREATE POLICY "Allow public viewing swipe comments" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'swipe-file-comments');

-- Política de delete: usuários autenticados podem deletar seus próprios uploads
CREATE POLICY "Allow users to delete own uploads swipe comments" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'swipe-file-comments' AND (owner = auth.uid()::text OR owner IS NULL));

-- Verificar se o bucket foi criado
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'swipe-file-comments';