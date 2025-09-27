-- Versão simples que deve funcionar
-- Execute cada comando separadamente no Supabase Dashboard

-- 1. Garantir bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remover políticas uma por uma
DROP POLICY IF EXISTS "task_files_allow_all" ON storage.objects;
DROP POLICY IF EXISTS "task_files_authenticated_access" ON storage.objects;
DROP POLICY IF EXISTS "task_files_public_access" ON storage.objects;
DROP POLICY IF EXISTS "task_files_all_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "task_files_public_read" ON storage.objects;

-- 3. Criar política única e super permissiva
CREATE POLICY "allow_all_task_files"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'task-files')
WITH CHECK (bucket_id = 'task-files');