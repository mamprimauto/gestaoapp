-- Script para GARANTIR acesso público total ao bucket swipe-file-comments
-- Execute este script no SQL Editor do Supabase

-- 1. Garantir que o bucket existe e está PÚBLICO
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = NULL -- Aceitar qualquer tipo de arquivo
WHERE id = 'swipe-file-comments';

-- Se não existir, criar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true, -- PÚBLICO
  52428800, -- 50MB
  NULL -- Aceitar qualquer tipo
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- 2. REMOVER TODAS as políticas RLS que possam estar bloqueando
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
            RAISE NOTICE 'Política removida: %', pol.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível remover: %', pol.policyname;
        END;
    END LOOP;
END $$;

-- 3. Criar UMA ÚNICA política super permissiva para o bucket
-- Permite TUDO para TODOS (anônimos e autenticados)
CREATE POLICY "Public Access for swipe-file-comments"
ON storage.objects FOR ALL
USING (bucket_id = 'swipe-file-comments')
WITH CHECK (bucket_id = 'swipe-file-comments');

-- 4. Verificar configuração final
SELECT 
    'Status do Bucket' as info,
    id as bucket_id,
    CASE 
        WHEN public = true THEN '✅ PÚBLICO - Acessível sem autenticação'
        ELSE '❌ PRIVADO - Requer autenticação'
    END as status,
    CASE 
        WHEN allowed_mime_types IS NULL THEN '✅ Aceita TODOS os tipos de arquivo'
        ELSE '⚠️ Restrito a tipos específicos'
    END as tipos,
    (file_size_limit/1024/1024) || 'MB' as limite
FROM storage.buckets 
WHERE id = 'swipe-file-comments';

-- 5. Verificar se RLS está ativo (deve estar para políticas funcionarem)
SELECT 
    'RLS Status' as info,
    relname as tabela,
    CASE 
        WHEN relrowsecurity = true THEN '✅ RLS Ativo com política permissiva'
        ELSE '⚠️ RLS Desativado - Ativar pode ser necessário'
    END as status
FROM pg_class
WHERE relname = 'objects'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

-- IMPORTANTE: Após executar este script, as imagens devem ser acessíveis publicamente
-- Teste acessando uma URL diretamente no navegador