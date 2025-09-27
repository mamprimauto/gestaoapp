-- Script para configurar organização para igorzimpel@gmail.com
-- Execute este script no SQL Editor do Supabase

-- 1. PRIMEIRO: Verificar seus dados atuais
SELECT 
  p.id as user_id,
  p.email,
  om.organization_id,
  o.name as org_name,
  om.role
FROM profiles p
LEFT JOIN organization_members om ON p.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE p.email = 'igorzimpel@gmail.com';

-- 2. SEGUNDO: Se não aparecer nenhuma organização, execute os comandos abaixo:

-- Criar organização para Igor
INSERT INTO organizations (name, created_by) 
VALUES ('Gestão App - Igor', (SELECT id FROM profiles WHERE email = 'igorzimpel@gmail.com' LIMIT 1));

-- Vincular Igor à organização como admin
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM organizations WHERE name = 'Gestão App - Igor' ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM profiles WHERE email = 'igorzimpel@gmail.com' LIMIT 1),
  'admin';

-- 3. TERCEIRO: Verificar se funcionou
SELECT 
  p.id as user_id,
  p.email,
  om.organization_id,
  o.name as org_name,
  om.role,
  'SUCCESS: Igor now has an organization!' as status
FROM profiles p
JOIN organization_members om ON p.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE p.email = 'igorzimpel@gmail.com';

-- 4. QUARTO: Verificar se as tabelas financeiras existem
SELECT 
  table_name,
  'Table exists!' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('financial_data', 'financial_tools', 'financial_employees')
ORDER BY table_name;