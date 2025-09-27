-- Script para verificar se o usuário tem organização
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se o usuário existe e tem organização
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    om.organization_id,
    om.role,
    o.name as org_name,
    o.slug as org_slug
FROM profiles p
LEFT JOIN organization_members om ON om.user_id = p.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE p.email = 'seu-email@aqui.com';  -- SUBSTITUA COM SEU EMAIL

-- 2. Se não tiver organização, criar uma manualmente
-- Descomente e execute se necessário:

/*
-- Criar organização
INSERT INTO organizations (name, slug, description, created_by)
VALUES (
    'My Test Workspace',
    'test-workspace-' || substr(md5(random()::text), 1, 8),
    'Workspace para testes A/B',
    'f3f3ebbe-b466-4afd-afef-0339ab05bc22'  -- SUBSTITUA COM SEU USER ID
)
RETURNING *;

-- Adicionar usuário como admin (use o ID da organização criada acima)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
    'ID-DA-ORG-CRIADA-ACIMA',  -- SUBSTITUA
    'f3f3ebbe-b466-4afd-afef-0339ab05bc22',  -- SUBSTITUA COM SEU USER ID
    'admin'
);
*/

-- 3. Verificar novamente
SELECT 
    om.*,
    o.name as org_name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'f3f3ebbe-b466-4afd-afef-0339ab05bc22';  -- SUBSTITUA COM SEU USER ID