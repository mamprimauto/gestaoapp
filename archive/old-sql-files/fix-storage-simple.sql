-- Script simplificado para corrigir políticas de storage
-- Funciona apenas com as permissões disponíveis no Supabase

-- Garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas existentes (se existirem)
DROP POLICY IF EXISTS "task_files_authenticated_all" ON storage.objects;
DROP POLICY IF EXISTS "task_files_public_select" ON storage.objects;
DROP POLICY IF EXISTS "task_files_all_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "task_files_public_read" ON storage.objects;

-- Criar política simples para usuários autenticados
CREATE POLICY "task_files_authenticated_access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'task-files')
WITH CHECK (bucket_id = 'task-files');

-- Criar política para leitura pública
CREATE POLICY "task_files_public_access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-files');