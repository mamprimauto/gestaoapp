-- ========================================================
-- DEBUG: VERIFICAR PERMISSÕES NO BANCO
-- ========================================================

-- 1. Ver todas as permissões atuais
SELECT 
  workspace_id,
  allowed_roles,
  array_length(allowed_roles, 1) as num_roles,
  created_at,
  updated_at
FROM public.workspace_permissions
ORDER BY workspace_id;

-- 2. Ver especificamente a área 'copy'
SELECT 
  workspace_id,
  allowed_roles,
  'admin' = ANY(allowed_roles) as admin_incluido,
  'editor' = ANY(allowed_roles) as editor_incluido,
  'copywriter' = ANY(allowed_roles) as copywriter_incluido,
  updated_at
FROM public.workspace_permissions
WHERE workspace_id = 'copy';

-- 3. Se quiser resetar as permissões do 'copy' para teste
-- DESCOMENTE as linhas abaixo para resetar:
-- DELETE FROM public.workspace_permissions WHERE workspace_id = 'copy';
-- INSERT INTO public.workspace_permissions (workspace_id, allowed_roles) 
-- VALUES ('copy', ARRAY['admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador']);