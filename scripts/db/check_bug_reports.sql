-- Verificar se existem bug reports no banco
SELECT 
  id,
  reporter_name,
  reporter_email,
  description,
  status,
  priority,
  created_at,
  screenshot_url
FROM bug_reports
ORDER BY created_at DESC;

-- Contar quantos bug reports existem
SELECT COUNT(*) as total_bugs FROM bug_reports;

-- Verificar as políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'bug_reports';