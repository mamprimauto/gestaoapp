-- Criar bucket vault-images para uploads de imagens do sistema de vault
-- Execute este script no Supabase SQL Editor

-- 1. Criar o bucket vault-images como público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-images',
  'vault-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

-- 2. Política de leitura pública (qualquer um pode ver as imagens)
CREATE POLICY "Public read access for vault images" ON storage.objects
FOR SELECT
USING (bucket_id = 'vault-images');

-- 3. Política de upload - apenas usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload vault images" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'vault-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Política de update - usuários podem atualizar seus próprios arquivos
CREATE POLICY "Users can update own vault images" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'vault-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'vault-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Política de delete - usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete own vault images" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'vault-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verificar se o bucket foi criado corretamente
SELECT * FROM storage.buckets WHERE id = 'vault-images';

-- Verificar políticas criadas
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
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%vault%';