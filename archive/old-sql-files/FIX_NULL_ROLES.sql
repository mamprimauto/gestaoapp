-- 🔧 CORREÇÃO DE ROLES NULL
-- Execute este script no Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR PERFIS COM ROLE NULL
-- ============================================
SELECT 
    id,
    email,
    name,
    role,
    CASE 
        WHEN role IS NULL THEN '❌ ROLE NULL'
        WHEN role = '' THEN '❌ ROLE VAZIO'
        ELSE '✅ OK'
    END as status
FROM profiles
WHERE role IS NULL OR role = '';

-- ============================================
-- 2. CONTAR QUANTOS PERFIS TÊM PROBLEMA
-- ============================================
SELECT 
    COUNT(*) as total_com_problema
FROM profiles
WHERE role IS NULL OR role = '';

-- ============================================
-- 3. CORRIGIR TODOS OS ROLES NULL/VAZIOS
-- ============================================
UPDATE profiles 
SET 
    role = CASE
        -- Definir admin para email conhecido
        WHEN email = 'igorzimpel@gmail.com' THEN 'admin'
        -- Outros emails conhecidos
        WHEN email = 'spectrumdigitalbr@gmail.com' THEN 'editor'
        WHEN email = 'igorxiles@gmail.com' THEN 'editor'
        WHEN email = 'demo@trafficpro.local' THEN 'editor'
        -- Default para editor
        ELSE 'editor'
    END,
    updated_at = NOW()
WHERE role IS NULL OR role = '';

-- ============================================
-- 4. ADICIONAR CONSTRAINT PARA PREVENIR NULLS
-- ============================================
-- Alterar coluna para NOT NULL com default
ALTER TABLE profiles 
ALTER COLUMN role SET NOT NULL,
ALTER COLUMN role SET DEFAULT 'editor';

-- ============================================
-- 5. VERIFICAR RESULTADO
-- ============================================
SELECT 
    email,
    name,
    role,
    CASE 
        WHEN role = 'admin' THEN '👑 Admin'
        WHEN role = 'editor' THEN '📝 Editor'
        WHEN role = 'copywriter' THEN '✏️ Copywriter'
        WHEN role = 'gestor_trafego' THEN '📊 Gestor'
        WHEN role = 'minerador' THEN '⛏️ Minerador'
        ELSE role
    END as role_visual
FROM profiles
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'editor' THEN 2
        WHEN 'copywriter' THEN 3
        WHEN 'gestor_trafego' THEN 4
        WHEN 'minerador' THEN 5
        ELSE 6
    END;

-- ============================================
-- 6. GARANTIR ADMIN CORRETO
-- ============================================
UPDATE profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'igorzimpel@gmail.com'
AND role != 'admin';

-- ============================================
-- 7. RESULTADO FINAL
-- ============================================
SELECT 
    '✅ ROLES CORRIGIDOS!' as status,
    COUNT(*) as total_perfis,
    SUM(CASE WHEN role IS NOT NULL AND role != '' THEN 1 ELSE 0 END) as perfis_ok,
    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins
FROM profiles;