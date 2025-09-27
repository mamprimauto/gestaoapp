-- 1. Verificar se existem arquivos no bucket
SELECT 
  id,
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  path_tokens,
  metadata
FROM storage.objects 
WHERE bucket_id = 'bug-reports'
ORDER BY created_at DESC;

-- 2. Verificar configuração do bucket
SELECT * FROM storage.buckets WHERE id = 'bug-reports';

-- 3. Ver os bug reports salvos com seus URLs
SELECT 
  id,
  description,
  screenshot_url,
  created_at
FROM bug_reports
WHERE screenshot_url IS NOT NULL
ORDER BY created_at DESC;

-- 4. Se não houver arquivos mas houver URLs nos bug_reports,
-- significa que o upload falhou mas o URL foi salvo mesmo assim