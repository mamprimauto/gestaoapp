-- 🔐 CONFIGURAR USUÁRIOS - EXEMPLOS PRÁTICOS
-- Execute estes comandos APÓS a migração principal

-- ===== PASSO 1: VER TODOS OS USUÁRIOS =====
-- Execute primeiro para ver os IDs dos usuários
SELECT 
    au.id,
    au.email,
    up.department,
    up.access_level,
    up.can_create_shared
FROM auth.users au
LEFT JOIN user_permissions up ON au.id = up.user_id
ORDER BY au.created_at;

-- ===== PASSO 2: TORNAR UM USUÁRIO ADMINISTRADOR =====
-- SUBSTITUA 'SEU_EMAIL_AQUI' pelo email do usuário que será admin
UPDATE user_permissions 
SET 
    access_level = 'admin',
    can_create_shared = true,
    can_access_cross_department = true
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'SEU_EMAIL_AQUI'
);

-- ===== PASSO 3: CONFIGURAR DEPARTAMENTOS =====

-- Administrador (Acesso Total)
UPDATE user_permissions 
SET 
    department = 'administrador',
    access_level = 'admin',
    can_create_shared = true,
    can_access_cross_department = true
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'admin@empresa.com'
);

-- Editor (Editor de vídeo)
UPDATE user_permissions 
SET 
    department = 'editor',
    access_level = 'user',
    can_create_shared = false
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'editor@empresa.com'
);

-- Copywriter (Criação de textos)
UPDATE user_permissions 
SET 
    department = 'copywriter',
    access_level = 'user',
    can_create_shared = false
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'copywriter@empresa.com'
);

-- Gestor de Tráfego (Gestão de campanhas)
UPDATE user_permissions 
SET 
    department = 'gestor',
    access_level = 'manager',
    can_create_shared = true,
    can_access_cross_department = true
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'gestor@empresa.com'
);

-- Minerador (Acesso Parcial)
UPDATE user_permissions 
SET 
    department = 'minerador',
    access_level = 'user',
    can_create_shared = false,
    can_access_cross_department = false
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'minerador@empresa.com'
);

-- ===== PASSO 4: DAR ACESSO CRUZADO ENTRE DEPARTAMENTOS =====

-- Exemplo: Copywriter que também pode ver senhas de Editor
UPDATE user_permissions 
SET additional_departments = ARRAY['editor']
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'copywriter@empresa.com'
);

-- Exemplo: Gestor que pode ver todos os departamentos
UPDATE user_permissions 
SET additional_departments = ARRAY['administrador', 'editor', 'copywriter', 'minerador']
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'gestor@empresa.com'
);

-- Exemplo: Editor que também pode ver senhas de Copywriter
UPDATE user_permissions 
SET additional_departments = ARRAY['copywriter']
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'editor@empresa.com'
);

-- ===== VERIFICAR CONFIGURAÇÕES =====
-- Execute para confirmar que tudo está correto
SELECT 
    au.email,
    up.department,
    up.access_level,
    up.can_create_shared,
    up.can_access_cross_department,
    up.additional_departments
FROM auth.users au
JOIN user_permissions up ON au.id = up.user_id
ORDER BY up.access_level DESC, up.department;

-- ===== COMANDOS ÚTEIS =====

-- Dar permissão para criar senhas compartilhadas
UPDATE user_permissions 
SET can_create_shared = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'usuario@empresa.com');

-- Remover permissões especiais
UPDATE user_permissions 
SET 
    additional_departments = '{}',
    can_create_shared = false,
    can_access_cross_department = false
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'usuario@empresa.com');

-- Ver quantas senhas cada usuário tem
SELECT 
    au.email,
    COUNT(vi.id) as total_senhas
FROM auth.users au
LEFT JOIN vault_items vi ON au.id = vi.user_id
GROUP BY au.id, au.email
ORDER BY total_senhas DESC;