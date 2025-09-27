-- ========================================================
-- VERIFICAR PERFIL DO USUÁRIO LOGADO
-- ========================================================

-- 1. Listar todos os perfis e seus roles
SELECT 
  id,
  email,
  name,
  role,
  approved,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 2. Verificar se há perfis sem role definido
SELECT 
  id,
  email,
  name,
  role,
  CASE 
    WHEN role IS NULL THEN 'SEM ROLE'
    WHEN role = '' THEN 'ROLE VAZIO'
    ELSE role
  END as status_role
FROM public.profiles
WHERE role IS NULL OR role = '';

-- 3. Contar perfis por role
SELECT 
  COALESCE(role, 'SEM ROLE') as role,
  COUNT(*) as total
FROM public.profiles
GROUP BY role
ORDER BY total DESC;

-- 4. Verificar especificamente o usuário admin (Igor)
SELECT 
  id,
  email,
  name,
  role,
  approved,
  'Este é o admin?' as pergunta,
  CASE WHEN role = 'admin' THEN 'SIM' ELSE 'NÃO' END as resposta
FROM public.profiles
WHERE email = 'igorzimpel@gmail.com';

-- 5. Se necessário, ATUALIZAR o role do Igor para admin
-- DESCOMENTE a linha abaixo para executar
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'igorzimpel@gmail.com';

-- 6. Verificar as permissões atuais dos workspaces
SELECT 
  workspace_id,
  allowed_roles,
  'admin' = ANY(allowed_roles) as admin_tem_acesso
FROM public.workspace_permissions
ORDER BY workspace_id;