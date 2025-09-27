-- ========================================
-- SOLUÇÃO AUTOMÁTICA: Criar organização para TODOS os usuários
-- Este script garante que TODOS os usuários tenham uma organização
-- ========================================

-- PASSO 1: Criar organizações para todos os usuários existentes que não têm
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
BEGIN
  -- Loop através de todos os usuários sem organização
  FOR user_record IN 
    SELECT p.id, p.full_name, p.email
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members om WHERE om.user_id = p.id
    )
  LOOP
    -- Criar organização para este usuário
    INSERT INTO organizations (name, slug, description, created_by)
    VALUES (
      COALESCE(user_record.full_name, 'User') || '''s Workspace',
      'workspace-' || substr(user_record.id::text, 1, 8) || '-' || extract(epoch from now())::int,
      'Workspace automático para testes A/B',
      user_record.id
    )
    RETURNING id INTO new_org_id;
    
    -- Adicionar usuário como admin da organização
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, user_record.id, 'admin');
    
    RAISE NOTICE 'Criada organização % para usuário %', new_org_id, user_record.email;
  END LOOP;
END $$;

-- PASSO 2: Garantir que todos os criadores de organizações são membros admin
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  o.id,
  o.created_by,
  'admin'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om 
  WHERE om.organization_id = o.id 
  AND om.user_id = o.created_by
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- PASSO 3: Criar função para auto-criar organização em novos registros
CREATE OR REPLACE FUNCTION auto_create_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Só criar se o usuário não tem organização
  IF NOT EXISTS (
    SELECT 1 FROM organization_members WHERE user_id = NEW.id
  ) THEN
    -- Criar nova organização
    INSERT INTO organizations (name, slug, description, created_by)
    VALUES (
      COALESCE(NEW.full_name, 'User') || '''s Workspace',
      'workspace-' || substr(NEW.id::text, 1, 8) || '-' || extract(epoch from now())::int,
      'Workspace automático para testes A/B',
      NEW.id
    )
    RETURNING id INTO new_org_id;
    
    -- Adicionar como admin
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'admin');
    
    RAISE NOTICE 'Auto-criada organização % para novo usuário %', new_org_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 4: Criar trigger para novos usuários
DROP TRIGGER IF EXISTS auto_create_org_on_profile_insert ON profiles;
CREATE TRIGGER auto_create_org_on_profile_insert
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_create_organization_for_user();

-- PASSO 5: Criar trigger para usuários atualizados (caso de primeiro login)
DROP TRIGGER IF EXISTS auto_create_org_on_profile_update ON profiles;
CREATE TRIGGER auto_create_org_on_profile_update
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
EXECUTE FUNCTION auto_create_organization_for_user();

-- ========================================
-- PASSO 6: Simplificar políticas RLS para permitir auto-criação
-- ========================================

-- Desabilitar temporariamente para aplicar novas políticas
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "organizations_select_members" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON organizations;
DROP POLICY IF EXISTS "org_members_select_same_org" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_admin" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_admin" ON organization_members;

-- Reabilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples e permissivas
-- Organizações: usuários podem ver suas próprias organizações
CREATE POLICY "users_see_own_orgs"
ON organizations FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM organization_members 
    WHERE organization_id = organizations.id
  )
  OR created_by = auth.uid()
);

-- Usuários podem criar organizações
CREATE POLICY "users_create_orgs"
ON organizations FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Usuários podem atualizar suas organizações
CREATE POLICY "users_update_own_orgs"
ON organizations FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM organization_members 
    WHERE organization_id = organizations.id
    AND role = 'admin'
  )
);

-- Membros: usuários podem ver membros de suas organizações
CREATE POLICY "users_see_org_members"
ON organization_members FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM organization_members om2
    WHERE om2.organization_id = organization_members.organization_id
  )
);

-- Admins podem adicionar membros
CREATE POLICY "admins_manage_members"
ON organization_members FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = organization_members.organization_id
    AND role = 'admin'
  )
  OR user_id = auth.uid() -- Permitir auto-adicionar (para triggers)
);

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Verificar quantos usuários têm organizações agora
SELECT 
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT om.user_id) as users_with_org,
  COUNT(DISTINCT p.id) - COUNT(DISTINCT om.user_id) as users_without_org
FROM profiles p
LEFT JOIN organization_members om ON om.user_id = p.id;

-- Listar organizações criadas
SELECT 
  o.id,
  o.name,
  o.slug,
  p.email as owner_email,
  om.role
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
JOIN profiles p ON p.id = om.user_id
ORDER BY o.created_at DESC;

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute este script COMPLETO no Supabase SQL Editor
-- 2. Verifique os resultados das queries de verificação
-- 3. Teste criar um teste A/B - deve funcionar para qualquer usuário
-- ========================================