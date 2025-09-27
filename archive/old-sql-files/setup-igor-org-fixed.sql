-- Script CORRIGIDO para configurar organização para igorzimpel@gmail.com
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

-- 2. SEGUNDO: Verificar estrutura da tabela organizations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- 3. TERCEIRO: Criar organização com todos os campos obrigatórios
INSERT INTO organizations (name, slug, created_by) 
VALUES (
  'Gestão App - Igor', 
  'gestao-app-igor', 
  (SELECT id FROM profiles WHERE email = 'igorzimpel@gmail.com' LIMIT 1)
);

-- 4. QUARTO: Vincular Igor à organização como admin
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM organizations WHERE slug = 'gestao-app-igor' LIMIT 1),
  (SELECT id FROM profiles WHERE email = 'igorzimpel@gmail.com' LIMIT 1),
  'admin';

-- 5. QUINTO: Verificar se funcionou
SELECT 
  p.id as user_id,
  p.email,
  om.organization_id,
  o.name as org_name,
  o.slug as org_slug,
  om.role,
  'SUCCESS: Igor now has an organization!' as status
FROM profiles p
JOIN organization_members om ON p.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE p.email = 'igorzimpel@gmail.com';