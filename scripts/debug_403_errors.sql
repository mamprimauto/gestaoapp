-- Script para investigar os erros 403 específicos
-- Vamos verificar essas tasks que estão gerando os erros

-- 1. Verificar as tasks específicas que estão dando erro
SELECT 
  'Task problemática' as status,
  t.id,
  t.title,
  t.organization_id,
  t.user_id,
  t.created_at,
  p.email as creator_email
FROM public.tasks t
LEFT JOIN public.profiles p ON t.user_id = p.id
WHERE t.id IN (
  '376bcb7c-2930-4389-b47f-ad6805a9027d',
  'f5f65b20-6b62-4804-ae63-6a74451e5114'
);

-- 2. Verificar se o usuário atual tem acesso à organização dessas tasks
-- Substitua 'USER_ID_ATUAL' pelo seu user ID (c9e6de2d-a0e9-48b9-8880-694b77bba330)
SELECT 
  'Acesso do usuário às organizações' as status,
  om.user_id,
  om.organization_id,
  om.role,
  o.name as org_name
FROM public.organization_members om
JOIN public.organizations o ON om.organization_id = o.id
WHERE om.user_id = 'c9e6de2d-a0e9-48b9-8880-694b77bba330';

-- 3. Verificar se essas tasks estão na organização correta
SELECT 
  'Verificação de organização das tasks' as status,
  t.id as task_id,
  t.organization_id as task_org_id,
  om.organization_id as user_org_id,
  CASE 
    WHEN t.organization_id = om.organization_id THEN 'MATCH' 
    ELSE 'MISMATCH' 
  END as access_status
FROM public.tasks t
CROSS JOIN public.organization_members om
WHERE t.id IN (
  '376bcb7c-2930-4389-b47f-ad6805a9027d',
  'f5f65b20-6b62-4804-ae63-6a74451e5114'
)
AND om.user_id = 'c9e6de2d-a0e9-48b9-8880-694b77bba330';

-- 4. Corrigir as tasks que estão na organização errada
-- (Execute apenas se houver MISMATCH no resultado acima)
UPDATE public.tasks 
SET organization_id = 'a214d299-3e9f-4b18-842b-c74dc52b5dfc'
WHERE id IN (
  '376bcb7c-2930-4389-b47f-ad6805a9027d',
  'f5f65b20-6b62-4804-ae63-6a74451e5114'
)
AND organization_id != 'a214d299-3e9f-4b18-842b-c74dc52b5dfc';

-- 5. Verificação final
SELECT 
  'Verificação final' as status,
  COUNT(*) as total_tasks_org_principal
FROM public.tasks 
WHERE organization_id = 'a214d299-3e9f-4b18-842b-c74dc52b5dfc';