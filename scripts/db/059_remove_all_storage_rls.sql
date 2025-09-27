-- Script para REMOVER COMPLETAMENTE as políticas RLS do Storage
-- Para projetos internos com poucos colaboradores confiáveis

-- 1. Garantir que o bucket existe e está configurado como PÚBLICO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true,  -- PÚBLICO: permite acesso sem autenticação
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 2. REMOVER TODAS as políticas RLS existentes para o bucket
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Loop através de todas as políticas relacionadas ao bucket
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Política removida: %', pol.policyname;
    END LOOP;
END $$;

-- 3. DESABILITAR RLS completamente na tabela storage.objects
-- ATENÇÃO: Isso remove TODA a segurança de nível de linha do Storage!
-- Use apenas em ambientes controlados com poucos usuários confiáveis
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 4. Verificar se RLS está desabilitado
SELECT 
    'RLS Status' as info,
    relname as tabela,
    CASE 
        WHEN relrowsecurity = false THEN '✅ RLS DESABILITADO - Storage sem restrições'
        ELSE '❌ RLS ainda ativo'
    END as status
FROM pg_class
WHERE relname = 'objects'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

-- 5. Verificar bucket
SELECT 
    'Bucket Status' as info,
    id as bucket_id,
    CASE 
        WHEN public = true THEN '✅ Bucket PÚBLICO'
        ELSE '❌ Bucket privado'
    END as acesso,
    file_size_limit/1024/1024 || 'MB' as limite
FROM storage.buckets 
WHERE id = 'swipe-file-comments';

-- IMPORTANTE: 
-- Após executar este script, QUALQUER usuário autenticado poderá:
-- - Fazer upload de arquivos
-- - Visualizar TODOS os arquivos
-- - Deletar QUALQUER arquivo
-- - Modificar QUALQUER arquivo
-- 
-- Use apenas em ambientes internos com colaboradores confiáveis!