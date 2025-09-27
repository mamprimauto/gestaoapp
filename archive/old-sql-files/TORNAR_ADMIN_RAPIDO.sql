-- 🚀 TORNAR-SE ADMIN RAPIDAMENTE
-- Execute no Supabase SQL Editor

-- PASSO 1: Verificar se as tabelas existem
SELECT 'Verificando tabelas...' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('user_permissions', 'vault_items');

-- PASSO 2: Ver todos os usuários
SELECT 'Usuários disponíveis:' as info;
SELECT id, email FROM auth.users ORDER BY created_at;

-- PASSO 3: Ver permissões atuais
SELECT 'Permissões atuais:' as info;
SELECT 
    au.email, 
    up.department, 
    up.access_level, 
    up.can_create_shared
FROM auth.users au
LEFT JOIN user_permissions up ON au.id = up.user_id
ORDER BY au.created_at;

-- PASSO 4: Tornar TODOS os usuários admin (temporariamente para teste)
UPDATE user_permissions 
SET 
    department = 'administrador',
    access_level = 'admin',
    can_create_shared = true,
    can_access_cross_department = true;

-- PASSO 5: Verificar resultado
SELECT 'Resultado final:' as info;
SELECT 
    au.email, 
    up.department, 
    up.access_level, 
    up.can_create_shared
FROM auth.users au
JOIN user_permissions up ON au.id = up.user_id;

-- PASSO 6: Se não existir user_permissions, criar para todos
INSERT INTO user_permissions (user_id, department, access_level, can_create_shared, can_access_cross_department)
SELECT 
    id,
    'administrador'::user_department,
    'admin'::user_access_level,
    true,
    true
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_permissions)
ON CONFLICT (user_id) DO UPDATE SET
    department = 'administrador',
    access_level = 'admin',
    can_create_shared = true,
    can_access_cross_department = true;

SELECT 'CONCLUÍDO! Todos os usuários são agora administradores.' as resultado;