-- 🔧 CORREÇÃO COMPLETA DE PROFILES E RLS
-- Execute este script INTEIRO no Supabase SQL Editor
-- Data: 2025-08-22

-- ============================================
-- PARTE 1: VERIFICAR SITUAÇÃO ATUAL
-- ============================================

-- Ver quantos usuários existem vs quantos perfis
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM profiles) 
        THEN '✅ Todos usuários têm perfil'
        ELSE '❌ Faltam perfis para alguns usuários'
    END as status;

-- Ver usuários sem perfil
SELECT u.id, u.email, u.created_at 
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ============================================
-- PARTE 2: FAZER BACKFILL DE PERFIS FALTANTES
-- ============================================

-- Criar perfis para usuários que não têm
INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'name',
        u.raw_app_meta_data->>'name',
        SPLIT_PART(u.email, '@', 1)
    ) as name,
    CASE
        -- Mapeamento específico por email
        WHEN u.email = 'igorzimpel@gmail.com' THEN 'admin'
        WHEN u.email = 'spectrumdigitalbr@gmail.com' THEN 'editor'
        WHEN u.email = 'igorxiles@gmail.com' THEN 'editor'
        WHEN u.email = 'demo@trafficpro.local' THEN 'editor'
        -- Verificar metadata
        WHEN LOWER(COALESCE(u.raw_user_meta_data->>'role','')) IN ('admin','editor','copywriter','gestor_trafego','minerador')
            THEN LOWER(u.raw_user_meta_data->>'role')
        -- Default
        ELSE 'editor'
    END as role,
    u.created_at,
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Garantir que os roles estão corretos
UPDATE public.profiles SET role = 'admin', updated_at = NOW() 
WHERE email = 'igorzimpel@gmail.com' AND role != 'admin';

UPDATE public.profiles SET role = 'editor', updated_at = NOW() 
WHERE email IN ('spectrumdigitalbr@gmail.com', 'igorxiles@gmail.com', 'demo@trafficpro.local') 
AND role != 'editor';

-- ============================================
-- PARTE 3: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================

-- Listar políticas existentes (para debug)
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_org" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- ============================================
-- PARTE 4: CRIAR POLÍTICAS CORRETAS E COMPLETAS
-- ============================================

-- 1. SELECT: Qualquer usuário autenticado pode ver todos os profiles
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. INSERT: Usuário pode criar seu próprio perfil
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 3. UPDATE: Usuário pode atualizar seu próprio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. UPDATE: Admin pode atualizar qualquer perfil
CREATE POLICY "profiles_update_admin"
ON public.profiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- 5. DELETE: Apenas admin pode deletar profiles (opcional)
CREATE POLICY "profiles_delete_admin"
ON public.profiles FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- ============================================
-- PARTE 5: GARANTIR TRIGGER PARA NOVOS USUÁRIOS
-- ============================================

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name text;
    v_role text;
BEGIN
    -- Extrair nome do metadata ou usar email
    v_name := COALESCE(
        new.raw_user_meta_data->>'name',
        new.raw_app_meta_data->>'name',
        SPLIT_PART(new.email, '@', 1)
    );
    
    -- Determinar role
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'editor');
    
    -- Validar role
    IF v_role NOT IN ('admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador') THEN
        v_role := 'editor';
    END IF;
    
    -- Inserir ou atualizar perfil
    INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
    VALUES (new.id, new.email, v_name, v_role, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            name = COALESCE(public.profiles.name, EXCLUDED.name),
            updated_at = NOW();
            
    RETURN new;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PARTE 6: GARANTIR RLS ESTÁ ATIVO
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 7: ADICIONAR COMENTÁRIOS EXPLICATIVOS
-- ============================================

COMMENT ON POLICY "profiles_select_authenticated" ON public.profiles IS 
'Permite que qualquer usuário autenticado veja todos os profiles para colaboração em equipe';

COMMENT ON POLICY "profiles_insert_own" ON public.profiles IS 
'Permite que usuários criem seu próprio profile quando necessário';

COMMENT ON POLICY "profiles_update_own" ON public.profiles IS 
'Permite que usuários atualizem seus próprios dados de perfil';

COMMENT ON POLICY "profiles_update_admin" ON public.profiles IS 
'Permite que administradores atualizem qualquer profile para gestão da equipe';

COMMENT ON POLICY "profiles_delete_admin" ON public.profiles IS 
'Permite que apenas administradores removam profiles se necessário';

-- ============================================
-- PARTE 8: VERIFICAR RESULTADO FINAL
-- ============================================

-- Verificar se todos os usuários têm perfil agora
SELECT 
    u.email,
    p.name,
    p.role,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ OK'
        ELSE '❌ SEM PERFIL'
    END as status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at;

-- Verificar políticas criadas
SELECT 
    policyname,
    cmd,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ Visualizar'
        WHEN 'INSERT' THEN '➕ Criar'
        WHEN 'UPDATE' THEN '✏️ Atualizar'
        WHEN 'DELETE' THEN '🗑️ Deletar'
    END as acao
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Contar totais finais
SELECT 
    'Usuários' as tipo,
    COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
    'Profiles' as tipo,
    COUNT(*) as total
FROM profiles
UNION ALL
SELECT 
    'Admins' as tipo,
    COUNT(*) as total
FROM profiles
WHERE role = 'admin';

-- ============================================
-- MENSAGEM FINAL
-- ============================================
SELECT '✅ Script executado com sucesso! Profiles e RLS corrigidos.' as mensagem;