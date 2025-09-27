-- 🔧 CORREÇÃO FINAL E SIMPLES PARA ROLES

-- ============================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS DE PROFILES
-- ============================================
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "allow_select_all" ON public.profiles;
DROP POLICY IF EXISTS "allow_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_can_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_any_profile" ON public.profiles;
DROP POLICY IF EXISTS "unified_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "allow_update_own" ON public.profiles;
DROP POLICY IF EXISTS "allow_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

-- ============================================
-- PASSO 2: CRIAR APENAS 2 POLÍTICAS SIMPLES
-- ============================================

-- Política 1: Todos podem LER todos os perfis
CREATE POLICY "anyone_can_read"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Política 2: Admin pode ATUALIZAR qualquer perfil, outros só o próprio
CREATE POLICY "admin_or_own_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (true) -- Todos podem tentar
WITH CHECK (
    -- Mas só funciona se:
    auth.uid() = id -- É o próprio perfil
    OR
    auth.uid() IN ( -- Ou é admin
        SELECT id FROM profiles WHERE role = 'admin'
    )
);

-- ============================================
-- PASSO 3: GARANTIR ADMIN CORRETO
-- ============================================
UPDATE profiles 
SET role = 'admin'
WHERE email = 'igorzimpel@gmail.com';

-- ============================================
-- PASSO 4: VERIFICAR RESULTADO
-- ============================================
SELECT 
    email,
    role,
    CASE 
        WHEN role = 'admin' THEN '👑 ADMIN'
        ELSE '👤 ' || role
    END as status
FROM profiles
ORDER BY 
    CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
    email;