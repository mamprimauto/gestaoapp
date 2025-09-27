-- 🚨 CORREÇÃO URGENTE: Definir Admin
-- Execute AGORA no Supabase SQL Editor

-- 1. Ver situação atual
SELECT id, email, name, role FROM profiles;

-- 2. Tornar PRIMEIRO usuário em ADMIN
UPDATE profiles 
SET role = 'admin'
WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1)
RETURNING email, role;

-- 3. Verificar correção
SELECT 
    email,
    role,
    CASE 
        WHEN role = 'admin' THEN '✅ ADMIN CONFIGURADO!'
        ELSE '❌ Ainda sem role'
    END as status
FROM profiles;