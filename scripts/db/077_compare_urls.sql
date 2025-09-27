-- Comparar URLs salvos com arquivos reais

-- 1. Ver os nomes dos arquivos no storage
SELECT 
  name as arquivo_no_storage,
  created_at
FROM storage.objects 
WHERE bucket_id = 'bug-reports'
ORDER BY created_at DESC;

-- 2. Ver as URLs salvas nos bug reports
SELECT 
  screenshot_url,
  -- Extrair apenas o nome do arquivo da URL
  SUBSTRING(screenshot_url FROM '[^/]+$') as nome_arquivo_extraido,
  created_at
FROM bug_reports
WHERE screenshot_url IS NOT NULL
ORDER BY created_at DESC;

-- 3. Para testar, pegue um nome de arquivo do primeiro query
-- e teste este URL no navegador:
-- https://dpajrkohmqdbskqbimqf.supabase.co/storage/v1/object/public/bug-reports/NOME_DO_ARQUIVO_AQUI