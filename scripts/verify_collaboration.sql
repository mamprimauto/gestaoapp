-- Script de verificação de integridade para sistema colaborativo
-- Execute este script no Supabase SQL Editor para diagnosticar problemas

-- 1. Verificar quantas organizações existem
SELECT 
  COUNT(*) as total_organizations,
  COUNT(DISTINCT created_by) as unique_creators
FROM public.organizations;

-- 2. Listar todas as organizações com membros
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.slug,
  COUNT(om.user_id) as member_count,
  STRING_AGG(p.email, ', ') as member_emails
FROM public.organizations o
LEFT JOIN public.organization_members om ON o.id = om.organization_id
LEFT JOIN auth.users au ON om.user_id = au.id
LEFT JOIN public.profiles p ON om.user_id = p.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at;

-- 3. Verificar se há usuários sem organização
SELECT 
  au.id as user_id,
  au.email,
  p.name,
  om.organization_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.organization_members om ON au.id = om.user_id
WHERE om.organization_id IS NULL;

-- 4. Verificar tasks por organização
SELECT 
  organization_id,
  COUNT(*) as task_count,
  COUNT(DISTINCT user_id) as unique_creators,
  MIN(created_at) as oldest_task,
  MAX(created_at) as newest_task
FROM public.tasks
GROUP BY organization_id
ORDER BY task_count DESC;

-- 5. Verificar se há tasks sem organization_id
SELECT 
  COUNT(*) as tasks_without_org,
  (SELECT STRING_AGG(id::text, ', ') FROM (
    SELECT id FROM public.tasks 
    WHERE organization_id IS NULL 
    LIMIT 5
  ) t) as sample_task_ids
FROM public.tasks
WHERE organization_id IS NULL;

-- 6. Verificar membros da mesma organização (para debug)
-- Substitua 'USER_EMAIL_1' e 'USER_EMAIL_2' pelos emails dos usuários que deveriam ver os mesmos dados
WITH user_orgs AS (
  SELECT 
    au.email,
    om.organization_id,
    om.role,
    o.name as org_name
  FROM auth.users au
  JOIN public.organization_members om ON au.id = om.user_id
  JOIN public.organizations o ON om.organization_id = o.id
  WHERE au.email IN ('USER_EMAIL_1', 'USER_EMAIL_2')
)
SELECT * FROM user_orgs;

-- 7. Verificar tasks visíveis para cada usuário
-- Substitua 'USER_EMAIL' pelo email do usuário
WITH user_org AS (
  SELECT om.organization_id
  FROM auth.users au
  JOIN public.organization_members om ON au.id = om.user_id
  WHERE au.email = 'USER_EMAIL'
  LIMIT 1
)
SELECT 
  t.id,
  t.title,
  t.organization_id,
  t.user_id,
  t.created_at,
  p.email as creator_email
FROM public.tasks t
JOIN user_org uo ON t.organization_id = uo.organization_id
LEFT JOIN public.profiles p ON t.user_id = p.id
ORDER BY t.created_at DESC
LIMIT 10;

-- 8. Verificar integridade das políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('tasks', 'organizations', 'organization_members')
ORDER BY tablename, policyname;

-- 9. Forçar migração de tasks órfãs (se existirem)
-- CUIDADO: Execute apenas se necessário
/*
UPDATE public.tasks t
SET organization_id = (
  SELECT om.organization_id 
  FROM public.organization_members om 
  WHERE om.user_id = t.user_id 
  LIMIT 1
)
WHERE t.organization_id IS NULL;
*/

-- 10. Estatísticas gerais do sistema
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.organizations) as total_orgs,
  (SELECT COUNT(*) FROM public.organization_members) as total_memberships,
  (SELECT COUNT(*) FROM public.tasks) as total_tasks,
  (SELECT COUNT(*) FROM public.tasks WHERE organization_id IS NOT NULL) as tasks_with_org,
  (SELECT COUNT(*) FROM public.tasks WHERE organization_id IS NULL) as tasks_without_org;