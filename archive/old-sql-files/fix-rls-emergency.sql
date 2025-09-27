-- CORREÇÃO EMERGENCIAL - Desabilitar RLS temporariamente
-- Execute este script no Supabase SQL Editor

-- 1. DESABILITAR RLS COMPLETAMENTE (temporário)
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se existem as tabelas necessárias
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tasks', 'organizations', 'organization_members');

-- 3. Se não existem as tabelas de organização, criar
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 4. Adicionar organization_id à tabela tasks se não existe
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Criar índices
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);

-- 6. Criar organização padrão para todos os usuários existentes
DO $$
DECLARE
  user_record record;
  org_id uuid;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT id, email FROM auth.users 
  LOOP
    -- Verificar se usuário já tem organização
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.user_id = user_record.id
    ) THEN
      -- Criar organização
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES (
        'Organização de ' || COALESCE(user_record.email, 'Usuário'),
        'org-' || substr(user_record.id::text, 1, 8),
        user_record.id
      )
      RETURNING id INTO org_id;
      
      -- Adicionar como admin
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (org_id, user_record.id, 'admin');
      
      -- Migrar tasks
      UPDATE public.tasks 
      SET organization_id = org_id 
      WHERE user_id = user_record.id AND organization_id IS NULL;
      
      RAISE NOTICE 'Criada organização % para %', org_id, user_record.email;
    END IF;
  END LOOP;
END $$;

-- 7. Função RPC para criar organização
CREATE OR REPLACE FUNCTION public.create_default_organization()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
  user_id uuid;
  user_email text;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object('error', 'Usuário não autenticado');
  END IF;
  
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  IF EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = user_id) THEN
    SELECT om.organization_id INTO org_id 
    FROM public.organization_members om 
    WHERE om.user_id = user_id LIMIT 1;
    
    RETURN json_build_object(
      'success', true,
      'organization_id', org_id,
      'message', 'Usuário já possui organização'
    );
  END IF;
  
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (
    'Organização de ' || COALESCE(user_email, 'Usuário'),
    'org-' || substr(user_id::text, 1, 8),
    user_id
  )
  RETURNING id INTO org_id;
  
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (org_id, user_id, 'admin');
  
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

GRANT EXECUTE ON FUNCTION public.create_default_organization() TO authenticated;

-- 8. Status final
SELECT 'RLS DESABILITADO - Teste a aplicação agora' as status;

-- IMPORTANTE: Após confirmar que funciona, execute este comando para reabilitar RLS:
-- ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;  
-- ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;