-- Script para criar políticas TOTALMENTE PERMISSIVAS no Storage
-- Simula a ausência de RLS sem precisar de permissões de owner

-- 1. Garantir que o bucket existe e está PÚBLICO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true,  -- PÚBLICO
  52428800, -- 50MB
  NULL -- Aceita QUALQUER tipo de arquivo
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = NULL; -- Remove restrições de tipo de arquivo

-- 2. Remover TODAS as políticas antigas do bucket
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%swipe%' 
            OR policyname LIKE '%upload%'
            OR policyname LIKE '%imagem%'
            OR policyname LIKE '%image%'
            OR policyname LIKE '%comment%'
        )
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
            RAISE NOTICE 'Política removida: %', pol.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível remover: %', pol.policyname;
        END;
    END LOOP;
END $$;

-- 3. Criar políticas SUPER PERMISSIVAS (permite TUDO para TODOS)

-- Política para SELECT (visualizar) - TODOS podem ver TUDO
CREATE POLICY "Anyone can view all files"
ON storage.objects FOR SELECT
USING (bucket_id = 'swipe-file-comments');

-- Política para INSERT (upload) - TODOS podem fazer upload
CREATE POLICY "Anyone can upload files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'swipe-file-comments');

-- Política para UPDATE - TODOS podem atualizar QUALQUER arquivo
CREATE POLICY "Anyone can update any file"
ON storage.objects FOR UPDATE
USING (bucket_id = 'swipe-file-comments')
WITH CHECK (bucket_id = 'swipe-file-comments');

-- Política para DELETE - TODOS podem deletar QUALQUER arquivo
CREATE POLICY "Anyone can delete any file"
ON storage.objects FOR DELETE
USING (bucket_id = 'swipe-file-comments');

-- 4. Verificar políticas criadas
SELECT 
    'Políticas criadas' as status,
    count(*) as total,
    string_agg(policyname, ', ') as politicas
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE 'Anyone%';

-- 5. Verificar status do bucket
SELECT 
    'Bucket configurado!' as mensagem,
    id,
    CASE 
        WHEN public = true THEN '✅ PÚBLICO'
        ELSE '❌ Privado'
    END as acesso,
    CASE 
        WHEN allowed_mime_types IS NULL THEN '✅ Aceita TODOS os tipos de arquivo'
        ELSE 'Restrito a: ' || array_to_string(allowed_mime_types, ', ')
    END as tipos_arquivo,
    (file_size_limit/1024/1024) || 'MB' as limite_tamanho
FROM storage.buckets 
WHERE id = 'swipe-file-comments';

-- RESULTADO ESPERADO:
-- ✅ Bucket público
-- ✅ Aceita qualquer tipo de arquivo
-- ✅ Qualquer pessoa pode fazer upload
-- ✅ Qualquer pessoa pode ver arquivos
-- ✅ Qualquer pessoa pode deletar/atualizar arquivos
-- 
-- Perfeito para ambientes internos com poucos colaboradores confiáveis!