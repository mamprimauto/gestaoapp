-- 👥 CONFIGURAR USUÁRIOS COM NOVOS DEPARTAMENTOS
-- Execute APÓS a migração MIGRACAO_DEPARTAMENTOS_FINAL.sql

-- ===== VER USUÁRIOS ATUAIS =====
SELECT 
    au.id,
    au.email,
    up.department,
    up.access_level
FROM auth.users au
LEFT JOIN user_permissions up ON au.id = up.user_id
ORDER BY au.created_at;

-- ===== CONFIGURAR ADMINISTRADOR =====
-- SUBSTITUA 'seu.email@empresa.com' pelo seu email real
UPDATE user_permissions 
SET 
    department = 'administrador',
    access_level = 'admin',
    can_create_shared = true,
    can_access_cross_department = true
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'seu.email@empresa.com'
);

-- ===== EXEMPLOS DE CONFIGURAÇÃO POR DEPARTAMENTO =====

-- Editor de vídeo
UPDATE user_permissions 
SET 
    department = 'editor',
    access_level = 'user',
    can_create_shared = false
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'editor@empresa.com'
);

-- Copywriter
UPDATE user_permissions 
SET 
    department = 'copywriter',
    access_level = 'user',
    can_create_shared = false
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'copywriter@empresa.com'
);

-- Gestor de Tráfego (com permissões de manager)
UPDATE user_permissions 
SET 
    department = 'gestor',
    access_level = 'manager',
    can_create_shared = true,
    can_access_cross_department = true
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'gestor@empresa.com'
);

-- Minerador (acesso limitado)
UPDATE user_permissions 
SET 
    department = 'minerador',
    access_level = 'user',
    can_create_shared = false,
    can_access_cross_department = false
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'minerador@empresa.com'
);

-- ===== CONFIGURAR ACESSOS CRUZADOS =====

-- Exemplo: Editor que também pode ver senhas de Copywriter
UPDATE user_permissions 
SET additional_departments = ARRAY['copywriter']
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'editor@empresa.com'
);

-- Exemplo: Gestor com acesso a todos os departamentos
UPDATE user_permissions 
SET additional_departments = ARRAY['administrador', 'editor', 'copywriter', 'minerador']
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'gestor@empresa.com'
);

-- ===== VERIFICAR CONFIGURAÇÃO FINAL =====
SELECT 
    au.email,
    up.department,
    up.access_level,
    up.can_create_shared,
    up.can_access_cross_department,
    up.additional_departments
FROM auth.users au
JOIN user_permissions up ON au.id = up.user_id
ORDER BY 
    CASE up.access_level 
        WHEN 'admin' THEN 1 
        WHEN 'manager' THEN 2 
        ELSE 3 
    END,
    up.department;

-- ===== COMANDOS ÚTEIS =====

-- Ver todos os departamentos disponíveis
SELECT unnest(enum_range(NULL::user_department)) as departamentos_disponiveis;

-- Contar usuários por departamento
SELECT department, COUNT(*) as total_usuarios
FROM user_permissions 
GROUP BY department
ORDER BY total_usuarios DESC;

-- Ver quem pode criar senhas compartilhadas
SELECT au.email, up.department, up.access_level
FROM auth.users au
JOIN user_permissions up ON au.id = up.user_id
WHERE up.can_create_shared = true
ORDER BY up.access_level DESC;