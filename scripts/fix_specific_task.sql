-- Verificar e corrigir a task específica que está causando problema

-- 1. Verificar a task problemática
SELECT 
  id,
  title,
  user_id,
  organization_id,
  created_at
FROM public.tasks
WHERE id = '20da89de-eaa5-4d8d-a888-2037da038f7a';

-- 2. Verificar se o usuário dessa task tem organização
WITH task_info AS (
  SELECT user_id 
  FROM public.tasks 
  WHERE id = '20da89de-eaa5-4d8d-a888-2037da038f7a'
)
SELECT 
  om.organization_id,
  o.name as org_name,
  om.role
FROM task_info t
LEFT JOIN public.organization_members om ON om.user_id = t.user_id
LEFT JOIN public.organizations o ON o.id = om.organization_id;

-- 3. Corrigir essa task específica
UPDATE public.tasks
SET organization_id = (
  SELECT om.organization_id 
  FROM public.organization_members om 
  WHERE om.user_id = tasks.user_id 
  LIMIT 1
)
WHERE id = '20da89de-eaa5-4d8d-a888-2037da038f7a'
AND organization_id IS NULL;

-- 4. Verificar se foi corrigida
SELECT 
  id,
  title,
  user_id,
  organization_id,
  created_at
FROM public.tasks
WHERE id = '20da89de-eaa5-4d8d-a888-2037da038f7a';

-- 5. Corrigir TODAS as tasks que ainda não têm organization_id
UPDATE public.tasks
SET organization_id = (
  SELECT om.organization_id 
  FROM public.organization_members om 
  WHERE om.user_id = tasks.user_id 
  LIMIT 1
)
WHERE organization_id IS NULL;

-- 6. Verificar quantas tasks ainda estão sem organization_id
SELECT 
  COUNT(*) as tasks_sem_organization
FROM public.tasks
WHERE organization_id IS NULL;