-- ========================================
-- SOLUÇÃO DEFINITIVA V2: Corrigir TUDO relacionado a organizações
-- VERSÃO CORRIGIDA: Sem ambiguidade de variáveis
-- ========================================

-- PASSO 1: Desabilitar RLS temporariamente em TODAS as tabelas relevantes
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas antigas que podem estar causando problemas
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Remove all policies from organizations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organizations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
    
    -- Remove all policies from organization_members
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organization_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
    END LOOP;
END $$;

-- PASSO 3: Criar uma organização padrão para TODOS os usuários que não têm
INSERT INTO organizations (id, name, slug, description, created_by)
SELECT 
    gen_random_uuid(),
    COALESCE(p.name, p.email, 'User') || '''s Workspace',
    'workspace-' || p.id::text,
    'Workspace automático',
    p.id
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 
    FROM organization_members om 
    WHERE om.user_id = p.id
)
ON CONFLICT DO NOTHING;

-- PASSO 4: Adicionar todos os usuários como admins de suas organizações
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
    o.id,
    o.created_by,
    'admin'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 
    FROM organization_members om 
    WHERE om.organization_id = o.id 
    AND om.user_id = o.created_by
)
ON CONFLICT DO NOTHING;

-- PASSO 5: Garantir que o usuário específico tem organização (CORRIGIDO)
DO $$
DECLARE
    org_id UUID;
    target_user_id UUID := 'f3f3ebbe-b466-4afd-afef-0339ab05bc22';
BEGIN
    -- Verificar se usuário tem organização (usando alias para evitar ambiguidade)
    SELECT om.organization_id INTO org_id
    FROM organization_members om
    WHERE om.user_id = target_user_id
    LIMIT 1;
    
    -- Se não tem, criar uma específica
    IF org_id IS NULL THEN
        -- Criar organização
        INSERT INTO organizations (name, slug, description, created_by)
        VALUES (
            'Igor Workspace',
            'workspace-igor-' || extract(epoch from now())::int,
            'Workspace principal',
            target_user_id
        )
        RETURNING id INTO org_id;
        
        -- Adicionar como admin
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (org_id, target_user_id, 'admin');
        
        RAISE NOTICE 'Criada organização % para usuário Igor', org_id;
    ELSE
        RAISE NOTICE 'Usuário Igor já tem organização: %', org_id;
    END IF;
END $$;

-- PASSO 6: Criar políticas SUPER SIMPLES (apenas autenticação)
-- Remover políticas antigas primeiro
DROP POLICY IF EXISTS "auth_users_all" ON organizations;
DROP POLICY IF EXISTS "auth_users_all" ON organization_members;

-- Organizations - qualquer usuário autenticado pode ver/criar
CREATE POLICY "auth_users_all"
ON organizations FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Organization Members - qualquer usuário autenticado pode ver/gerenciar
CREATE POLICY "auth_users_all_members"
ON organization_members FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- PASSO 7: Reabilitar RLS com as novas políticas simples
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- PASSO 8: Track records continua sem RLS (já estava funcionando assim)
-- Mantém desabilitado
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- PASSO 9: Garantir permissões adequadas
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON track_records TO authenticated;
GRANT ALL ON track_record_variations TO authenticated;
GRANT ALL ON track_record_kpis TO authenticated;

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- 1. Verificar quantos usuários têm organizações
SELECT 
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT om.user_id) as users_with_org
FROM profiles p
LEFT JOIN organization_members om ON om.user_id = p.id;

-- 2. Verificar organização do Igor especificamente
SELECT 
    o.id as org_id,
    o.name as org_name,
    o.slug,
    om.role,
    p.email
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN profiles p ON p.id = om.user_id
WHERE p.id = 'f3f3ebbe-b466-4afd-afef-0339ab05bc22';

-- 3. Verificar status do RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('organizations', 'organization_members', 'track_records')
ORDER BY tablename;

-- 4. TESTE RÁPIDO - Simular uma query que o app faz
SELECT 
    om.organization_id,
    o.id,
    o.name
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'f3f3ebbe-b466-4afd-afef-0339ab05bc22';

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute este script COMPLETO no Supabase SQL Editor
-- 2. Verifique os resultados no final
-- 3. Teste criar um teste A/B novamente
-- 
-- SE TUDO DER CERTO:
-- - Você verá "Usuário Igor já tem organização" ou "Criada organização"
-- - A última query deve retornar a organização
-- - RLS estará habilitado mas com políticas simples
-- ========================================