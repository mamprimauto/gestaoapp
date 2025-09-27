-- Script SIMPLES para configurar storage de comentários
-- Use este se o 055 der erro

-- 1. Criar/Atualizar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true,
  52428800,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 2. Habilitar RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Política de Upload (bem simples)
CREATE POLICY "Anyone authenticated can upload to swipe comments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'swipe-file-comments');

-- 4. Política de Visualização (pública)
CREATE POLICY "Anyone can view swipe comments files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'swipe-file-comments');

-- 5. Política de Delete (próprios arquivos)
CREATE POLICY "Users can delete own swipe comment files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'swipe-file-comments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verificar bucket
SELECT 'Bucket criado/atualizado:' as status, 
       id, 
       public, 
       file_size_limit/1024/1024 || 'MB' as size_limit
FROM storage.buckets 
WHERE id = 'swipe-file-comments';