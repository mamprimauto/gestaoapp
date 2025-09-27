-- Script para verificar e criar organização para usuário
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar usuários existentes
SELECT 
  p.id as user_id,
  p.email,
  om.organization_id,
  o.name as org_name
FROM profiles p
LEFT JOIN organization_members om ON p.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 2. Se você não tem organização, execute os comandos abaixo:
-- (Substitua 'seu-email@exemplo.com' pelo seu email real)

-- Primeiro, encontre seu user_id:
-- SELECT id FROM profiles WHERE email = 'seu-email@exemplo.com';

-- Depois, se necessário, crie uma organização e vincule:
/*
-- Criar organização
INSERT INTO organizations (name, created_by) 
VALUES ('Minha Empresa', (SELECT id FROM profiles WHERE email = 'seu-email@exemplo.com' LIMIT 1));

-- Vincular usuário à organização
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM organizations WHERE name = 'Minha Empresa' ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM profiles WHERE email = 'seu-email@exemplo.com' LIMIT 1),
  'admin';
*/

-- 3. Verificar se funcionou
SELECT 
  p.email,
  om.organization_id,
  o.name as org_name,
  om.role
FROM profiles p
JOIN organization_members om ON p.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE p.email = 'seu-email@exemplo.com';