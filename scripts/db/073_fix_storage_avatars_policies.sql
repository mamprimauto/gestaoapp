-- Corrigir políticas RLS para o bucket avatars
-- Permitir que usuários autenticados façam upload e leitura

-- Primeiro, remover políticas existentes se houver
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_policy" ON storage.objects;

-- Criar política para permitir uploads de avatares por usuários autenticados
CREATE POLICY "avatars_upload_policy" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Criar política para permitir leitura pública de avatares
CREATE POLICY "avatars_select_policy" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Criar política para permitir delete de avatares por usuários autenticados
CREATE POLICY "avatars_delete_policy" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Criar política para permitir update de avatares por usuários autenticados
CREATE POLICY "avatars_update_policy" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Garantir que RLS está habilitado para storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Garantir que o bucket existe e está configurado como público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[];