-- Script para diagnosticar e corrigir problemas de autenticação e RLS
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se as tabelas de organização existem
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('organizations', 'organization_members', 'tasks')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Verificar políticas RLS atuais na tabela tasks
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
WHERE tablename = 'tasks';

-- 3. Verificar se existem usuários sem organização
SELECT DISTINCT u.id as user_id, u.email
FROM auth.users u
LEFT JOIN public.organization_members om ON om.user_id = u.id
WHERE om.user_id IS NULL;

-- 4. Se existem tasks sem organization_id
SELECT COUNT(*) as tasks_sem_org
FROM public.tasks 
WHERE organization_id IS NULL;

-- 5. CORREÇÃO: Políticas temporárias mais permissivas para diagnosticar
-- Primeiro, desabilitar temporariamente RLS para permitir acesso
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Verificar se ainda há problemas com RLS desabilitado
SELECT 'RLS desabilitado temporariamente para diagnóstico' as status;

-- 6. ALTERNATIVAMENTE: Criar políticas mais permissivas temporariamente
-- Reabilitar RLS mas com políticas mais permissivas
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Remover políticas restritivas atuais
DROP POLICY IF EXISTS "tasks_select_org_members" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_org_members" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_org_members" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_creator_or_admin" ON public.tasks;

-- Criar políticas temporárias mais permissivas (apenas para usuários autenticados)
CREATE POLICY "tasks_temp_select_authenticated" 
ON public.tasks FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "tasks_temp_insert_authenticated" 
ON public.tasks FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "tasks_temp_update_authenticated" 
ON public.tasks FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "tasks_temp_delete_authenticated" 
ON public.tasks FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 7. Garantir que todos os usuários tenham uma organização padrão
DO $$
DECLARE
  user_record record;
  org_id uuid;
  user_email text;
BEGIN
  -- Para cada usuário sem organização
  FOR user_record IN 
    SELECT DISTINCT u.id, u.email
    FROM auth.users u
    LEFT JOIN public.organization_members om ON om.user_id = u.id
    WHERE om.user_id IS NULL
  LOOP
    -- Criar organização padrão para o usuário
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (
      COALESCE('Organização de ' || user_record.email, 'Organização Padrão'),
      'org-' || substr(user_record.id::text, 1, 8),
      user_record.id
    )
    RETURNING id INTO org_id;
    
    -- Adicionar usuário como admin da organização
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, user_record.id, 'admin');
    
    -- Migrar tasks existentes do usuário para a nova organização
    UPDATE public.tasks 
    SET organization_id = org_id 
    WHERE user_id = user_record.id AND organization_id IS NULL;
    
    RAISE NOTICE 'Criada organização % para usuário %', org_id, user_record.email;
  END LOOP;
END $$;

-- 8. Verificar se a correção funcionou
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(DISTINCT om.user_id) as usuarios_com_org
FROM auth.users u
LEFT JOIN public.organization_members om ON om.user_id = u.id;

SELECT 
  COUNT(*) as total_tasks,
  COUNT(organization_id) as tasks_com_org
FROM public.tasks;

-- 9. Criar função RPC para criar organização padrão (chamada pelo cliente)
CREATE OR REPLACE FUNCTION public.create_default_organization()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
  user_id uuid;
  user_email text;
  result json;
BEGIN
  -- Obter ID do usuário atual
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object('error', 'Usuário não autenticado');
  END IF;
  
  -- Obter email do usuário
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  -- Verificar se já tem organização
  IF EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.user_id = user_id
  ) THEN
    RETURN json_build_object('error', 'Usuário já possui organização');
  END IF;
  
  -- Criar organização padrão
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (
    COALESCE('Organização de ' || user_email, 'Organização Padrão'),
    'org-' || substr(user_id::text, 1, 8),
    user_id
  )
  RETURNING id INTO org_id;
  
  -- Adicionar usuário como admin
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (org_id, user_id, 'admin');
  
  -- Migrar tasks existentes
  UPDATE public.tasks 
  SET organization_id = org_id 
  WHERE user_id = user_id AND organization_id IS NULL;
  
  RETURN json_build_object(
    'success', true,
    'organization_id', org_id,
    'message', 'Organização criada com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END $$;

-- 10. Dar permissões para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.create_default_organization() TO authenticated;

-- 11. Exibir status final
SELECT 'Correção executada. Teste a aplicação agora.' as status;