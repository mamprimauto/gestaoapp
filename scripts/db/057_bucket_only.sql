-- Script para configurar APENAS o bucket (sem políticas RLS)
-- As políticas devem ser configuradas via Dashboard do Supabase

-- 1. Criar/Atualizar bucket como PÚBLICO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'swipe-file-comments', 
  'swipe-file-comments', 
  true,  -- PÚBLICO: permite visualização sem autenticação
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 2. Verificar se foi criado
SELECT 
  'Bucket configurado com sucesso!' as mensagem,
  id as bucket_id,
  CASE 
    WHEN public = true THEN '✅ Público (OK)'
    ELSE '❌ Privado (ERRO)'
  END as status_publico,
  file_size_limit/1024/1024 || 'MB' as limite_arquivo,
  array_length(allowed_mime_types, 1) || ' tipos permitidos' as tipos_mime
FROM storage.buckets 
WHERE id = 'swipe-file-comments';

-- IMPORTANTE: Após executar este script, você precisa:
-- 1. Ir em Storage > Policies no Dashboard
-- 2. Adicionar as políticas manualmente para o bucket 'swipe-file-comments'
-- 3. Ou usar o bucket sem RLS (já que está público)