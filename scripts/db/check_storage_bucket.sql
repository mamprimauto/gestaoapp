-- Verificar se o bucket bug-reports existe e está público
SELECT * FROM storage.buckets WHERE id = 'bug-reports';

-- Verificar as políticas do bucket
SELECT * FROM storage.policies WHERE bucket_id = 'bug-reports';

-- Verificar os arquivos no bucket (se houver)
SELECT 
  id,
  bucket_id,
  name,
  owner,
  created_at,
  updated_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'bug-reports'
ORDER BY created_at DESC
LIMIT 10;

-- Se o bucket não estiver público, execute isto:
-- UPDATE storage.buckets 
-- SET public = true 
-- WHERE id = 'bug-reports';