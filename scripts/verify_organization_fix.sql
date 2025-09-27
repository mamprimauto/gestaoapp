-- Verificar se a correção funcionou

-- 1. Contar quantas tasks têm organization_id NULL
SELECT 
  COUNT(*) as tasks_sem_organization
FROM public.tasks 
WHERE organization_id IS NULL;

-- 2. Verificar total de tasks e quantas têm organization_id
SELECT 
  COUNT(*) as total_tasks,
  COUNT(organization_id) as tasks_com_organization,
  COUNT(*) - COUNT(organization_id) as tasks_sem_organization
FROM public.tasks;

-- 3. Listar primeiras 5 tasks para verificar se têm organization_id
SELECT 
  id,
  title,
  user_id,
  organization_id,
  created_at
FROM public.tasks
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar se as organizações foram criadas
SELECT 
  COUNT(*) as total_organizations
FROM public.organizations;

-- 5. Verificar membros das organizações
SELECT 
  o.name as organization_name,
  COUNT(om.user_id) as total_members
FROM public.organizations o
LEFT JOIN public.organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name;