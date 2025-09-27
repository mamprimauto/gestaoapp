-- Script para configurar organização para o usuário Igor
-- Execute este script no Supabase SQL Editor

DO $$
DECLARE
  target_user_id UUID := 'f3f3ebbe-b466-4afd-afef-0339ab05bc22';
  org_id UUID;
BEGIN
  -- Verificar se usuário já tem organização
  SELECT om.organization_id INTO org_id
  FROM public.organization_members om 
  WHERE om.user_id = target_user_id
  LIMIT 1;
  
  IF org_id IS NULL THEN
    -- Criar nova organização
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (
      'Gestão App',
      'gestao-app-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
      target_user_id
    )
    RETURNING id INTO org_id;
    
    -- Adicionar usuário como admin da organização
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, target_user_id, 'admin');
    
    RAISE NOTICE 'Organização criada com ID: %', org_id;
  ELSE
    RAISE NOTICE 'Usuário já possui organização com ID: %', org_id;
  END IF;
END $$;