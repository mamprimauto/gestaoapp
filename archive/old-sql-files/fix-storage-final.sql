-- Script definitivo para resolver RLS de storage
-- Remove TODAS as políticas e cria uma muito permissiva

-- 1. Remover TODAS as políticas existentes do bucket task-files
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%task%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON storage.objects';
    END LOOP;
END $$;

-- 2. Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-files', 'task-files', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- 3. Criar política super permissiva para qualquer operação
CREATE POLICY "task_files_allow_all"
ON storage.objects FOR ALL
USING (bucket_id = 'task-files')
WITH CHECK (bucket_id = 'task-files');

-- 4. Verificar se RLS está habilitado na tabela objects
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 5. Se necessário, desabilitar RLS temporariamente (apenas para este bucket)
-- Nota: Isso é uma medida extrema, mas necessária se nada mais funcionar
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;