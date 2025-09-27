-- Script simplificado para criar bucket de storage
-- Execute este no SQL Editor do Supabase

-- 1. Criar o bucket (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('swipe-file-comments', 'swipe-file-comments', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow authenticated uploads swipe comments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing swipe comments" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own uploads swipe comments" ON storage.objects;

-- 3. Criar política simples de upload
CREATE POLICY "Allow authenticated uploads swipe comments" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'swipe-file-comments');

-- 4. Criar política simples de visualização pública
CREATE POLICY "Allow public viewing swipe comments" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'swipe-file-comments');

-- 5. Verificar se funcionou
SELECT 
  'Bucket criado com sucesso!' as status,
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'swipe-file-comments';