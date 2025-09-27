-- Solução simples: Garantir que o bucket está público e sem restrições

-- 1. Tornar o bucket público
UPDATE storage.buckets 
SET 
  public = true,
  avif_autodetection = false,
  file_size_limit = 52428800  -- 50MB
WHERE id = 'bug-reports';

-- 2. Verificar arquivos existentes no bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'bug-reports'
ORDER BY created_at DESC;

-- 3. Se você quiser testar acessando um arquivo diretamente:
-- Copie o nome de um arquivo da query acima e teste este URL no navegador:
-- https://dpajrkohmqdbskqbimqf.supabase.co/storage/v1/object/public/bug-reports/NOME_DO_ARQUIVO_AQUI

-- 4. Se ainda não funcionar, pode ser necessário recriar o bucket:
-- DELETE FROM storage.buckets WHERE id = 'bug-reports';
-- INSERT INTO storage.buckets (id, name, public) VALUES ('bug-reports', 'bug-reports', true);