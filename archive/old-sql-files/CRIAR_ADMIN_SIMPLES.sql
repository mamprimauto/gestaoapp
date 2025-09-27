-- 👤 CRIAR USUÁRIO ADMINISTRADOR
-- Execute APÓS o reset completo

-- PASSO 1: Ver seus dados
SELECT id, email FROM auth.users WHERE email LIKE '%@%';

-- PASSO 2: Tornar você administrador
-- SUBSTITUA 'seu.email@dominio.com' pelo seu email real da lista acima
UPDATE user_permissions 
SET 
    department = 'administrador',
    access_level = 'admin',
    can_create_shared = true,
    can_access_cross_department = true
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'seu.email@dominio.com'
);

-- PASSO 3: Verificar se funcionou
SELECT 
    au.email,
    up.department,
    up.access_level,
    up.can_create_shared
FROM auth.users au
JOIN user_permissions up ON au.id = up.user_id
WHERE up.access_level = 'admin';

-- DEVE MOSTRAR SEU EMAIL COM department='administrador' e access_level='admin'