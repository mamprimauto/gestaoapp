-- 🔧 CORREÇÃO SIMPLES E DIRETA DE PROFILES
-- Execute este script COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. VER SITUAÇÃO ATUAL
-- ============================================
SELECT 
    u.email,
    p.id as profile_id,
    p.role,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ TEM PERFIL'
        ELSE '❌ SEM PERFIL'
    END as status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at;

-- ============================================
-- 2. CRIAR PERFIS FALTANTES (SEM DESATIVAR RLS)
-- ============================================

-- Primeiro, vamos usar uma função com SECURITY DEFINER para bypass RLS
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Inserir perfis para todos os usuários que não têm
    INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
    SELECT
        u.id,
        u.email,
        COALESCE(
            u.raw_user_meta_data->>'name',
            SPLIT_PART(u.email, '@', 1)
        ) as name,
        CASE
            WHEN u.email = 'igorzimpel@gmail.com' THEN 'admin'
            WHEN u.email IN ('spectrumdigitalbr@gmail.com', 'igorxiles@gmail.com') THEN 'editor'
            ELSE 'editor'
        END as role,
        u.created_at,
        NOW()
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;
    
    -- Atualizar roles específicos
    UPDATE public.profiles 
    SET role = 'admin', updated_at = NOW() 
    WHERE email = 'igorzimpel@gmail.com';
    
    UPDATE public.profiles 
    SET role = 'editor', updated_at = NOW() 
    WHERE email IN ('spectrumdigitalbr@gmail.com', 'igorxiles@gmail.com');
END;
$$;

-- Executar a função
SELECT create_missing_profiles();

-- ============================================
-- 3. VERIFICAR SE FUNCIONOU
-- ============================================
SELECT 
    u.email,
    p.name,
    p.role,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ PERFIL CRIADO'
        ELSE '❌ AINDA SEM PERFIL'
    END as status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at;

-- ============================================
-- 4. ADICIONAR POLÍTICA SELECT SIMPLES
-- ============================================

-- Remover política antiga se existir
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "allow_select_all" ON public.profiles;

-- Criar política nova super simples
CREATE POLICY "anyone_can_read_profiles"
ON public.profiles 
FOR SELECT 
USING (true);  -- Permite QUALQUER usuário autenticado ver TODOS os perfis

-- ============================================
-- 5. ADICIONAR POLÍTICA INSERT
-- ============================================

-- Remover antigas
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "allow_insert_own" ON public.profiles;

-- Criar nova
CREATE POLICY "users_can_insert_own_profile"
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ============================================
-- 6. ADICIONAR POLÍTICA UPDATE
-- ============================================

-- Remover antigas
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "allow_update_own" ON public.profiles;

-- Criar nova
CREATE POLICY "users_can_update_own_profile"
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 7. VERIFICAR POLÍTICAS CRIADAS
-- ============================================
SELECT 
    policyname,
    cmd,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ Ver perfis'
        WHEN 'INSERT' THEN '➕ Criar perfil'
        WHEN 'UPDATE' THEN '✏️ Atualizar perfil'
    END as permissao
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- ============================================
-- 8. GARANTIR RLS ESTÁ ATIVO
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. TESTE FINAL
-- ============================================
SELECT 
    COUNT(*) as total_usuarios,
    (SELECT COUNT(*) FROM profiles) as total_perfis,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM profiles) 
        THEN '✅ SUCESSO: Todos têm perfil!'
        ELSE '❌ Ainda faltam perfis'
    END as resultado
FROM auth.users;

-- ============================================
-- 10. LIMPAR FUNÇÃO TEMPORÁRIA
-- ============================================
DROP FUNCTION IF EXISTS create_missing_profiles();