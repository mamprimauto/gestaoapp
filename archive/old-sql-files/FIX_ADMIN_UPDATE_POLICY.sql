-- 🛡️ CORREÇÃO DE PERMISSÕES PARA ADMIN EDITAR FUNÇÕES
-- Execute este script no Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR PERFIL DO ADMIN
-- ============================================
SELECT 
    id,
    email,
    name,
    role,
    CASE 
        WHEN role = 'admin' THEN '✅ É ADMIN'
        ELSE '❌ NÃO É ADMIN - Role: ' || role
    END as status
FROM profiles
WHERE email = 'igorzimpel@gmail.com';

-- ============================================
-- 2. GARANTIR QUE igorzimpel@gmail.com É ADMIN
-- ============================================
UPDATE profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'igorzimpel@gmail.com';

-- Verificar se funcionou
SELECT 
    email,
    role,
    '✅ ATUALIZADO PARA ADMIN' as status
FROM profiles
WHERE email = 'igorzimpel@gmail.com';

-- ============================================
-- 3. VERIFICAR POLÍTICAS DE UPDATE EXISTENTES
-- ============================================
SELECT 
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
AND cmd = 'UPDATE';

-- ============================================
-- 4. REMOVER POLÍTICAS DE UPDATE ANTIGAS
-- ============================================
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "allow_update_own" ON public.profiles;
DROP POLICY IF EXISTS "allow_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

-- ============================================
-- 5. CRIAR POLÍTICAS DE UPDATE CORRETAS
-- ============================================

-- Política 1: Usuário pode atualizar SEU PRÓPRIO perfil (exceto role)
CREATE POLICY "user_update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND (
        -- Se não está mudando o role, permite
        role = (SELECT role FROM profiles WHERE id = auth.uid())
        OR
        -- Se é admin, pode mudar qualquer coisa
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
);

-- Política 2: Admin pode atualizar QUALQUER perfil
CREATE POLICY "admin_update_any_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (true); -- Admin pode fazer qualquer alteração

-- ============================================
-- 6. VERIFICAR POLÍTICAS CRIADAS
-- ============================================
SELECT 
    policyname,
    CASE 
        WHEN policyname LIKE '%admin%' THEN '👑 Política de Admin'
        WHEN policyname LIKE '%own%' THEN '👤 Política de Usuário'
        ELSE '❓ Outra política'
    END as tipo,
    cmd as comando
FROM pg_policies 
WHERE tablename = 'profiles'
AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- 7. TESTE: Simular update como admin
-- ============================================
-- Este teste mostra quais perfis o admin pode atualizar
WITH admin_user AS (
    SELECT id, role 
    FROM profiles 
    WHERE email = 'igorzimpel@gmail.com'
)
SELECT 
    p.email,
    p.role,
    CASE 
        WHEN au.role = 'admin' THEN '✅ Admin pode editar'
        ELSE '❌ Sem permissão'
    END as permissao
FROM profiles p
CROSS JOIN admin_user au
LIMIT 5;

-- ============================================
-- 8. GARANTIR RLS ESTÁ ATIVO
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. RESULTADO FINAL
-- ============================================
SELECT 
    '✅ POLÍTICAS DE ADMIN CORRIGIDAS!' as status,
    'Admin (' || email || ') agora pode editar todas as funções' as mensagem
FROM profiles
WHERE email = 'igorzimpel@gmail.com'
AND role = 'admin';