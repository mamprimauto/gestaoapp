-- Script para consolidar todos os usuários e tasks em uma única organização
-- EXECUTE COM CUIDADO - ESTE SCRIPT MUDA A ESTRUTURA DE COLABORAÇÃO

-- 1. Identificar a organização com mais tasks (será nossa organização principal)
WITH main_org AS (
  SELECT organization_id, COUNT(*) as task_count
  FROM public.tasks
  GROUP BY organization_id
  ORDER BY task_count DESC
  LIMIT 1
)
SELECT 
  o.id as main_org_id,
  o.name as main_org_name,
  mo.task_count
FROM main_org mo
JOIN public.organizations o ON o.id = mo.organization_id;

-- 2. Mover todos os usuários para a organização principal
-- ATENÇÃO: Substitua 'MAIN_ORG_ID' pelo ID da organização principal do resultado acima

-- Primeiro, remover membros duplicados que já estão na org principal
DELETE FROM public.organization_members 
WHERE organization_id != 'MAIN_ORG_ID'
AND user_id IN (
  SELECT user_id 
  FROM public.organization_members 
  WHERE organization_id = 'MAIN_ORG_ID'
);

-- Mover usuários das outras organizações para a principal
UPDATE public.organization_members 
SET organization_id = 'MAIN_ORG_ID'
WHERE organization_id != 'MAIN_ORG_ID';

-- 3. Mover todas as tasks para a organização principal
UPDATE public.tasks 
SET organization_id = 'MAIN_ORG_ID'
WHERE organization_id != 'MAIN_ORG_ID';

-- 4. Opcional: Remover organizações vazias (cuidado!)
/*
DELETE FROM public.organizations 
WHERE id != 'MAIN_ORG_ID'
AND id NOT IN (
  SELECT DISTINCT organization_id 
  FROM public.organization_members
);
*/

-- 5. Verificação final - todos devem estar na mesma org
SELECT 
  'Verificação Final' as status,
  COUNT(DISTINCT om.organization_id) as total_orgs_com_usuarios,
  COUNT(DISTINCT t.organization_id) as total_orgs_com_tasks,
  COUNT(DISTINCT om.user_id) as total_usuarios,
  COUNT(t.id) as total_tasks
FROM public.organization_members om
FULL OUTER JOIN public.tasks t ON t.organization_id = om.organization_id;