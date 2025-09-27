-- 🚨 CORREÇÃO FORÇADA DE PROFILES (ÚLTIMA TENTATIVA)
-- Este script DESATIVA temporariamente o RLS para garantir que funcione

-- ============================================
-- PARTE 1: DESATIVAR RLS TEMPORARIAMENTE
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: CRIAR PERFIS PARA TODOS OS USUÁRIOS
-- ============================================
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
        WHEN u.email = 'igorzimpel@gmail.com' THEN 'admin'
        WHEN u.email = 'spectrumdigitalbr@gmail.com' THEN 'editor'
        WHEN u.email = 'igorxiles@gmail.com' THEN 'editor'
        WHEN u.email = 'demo@trafficpro.local' THEN 'editor'
        ELSE 'editor'
    END as role,
    COALESCE(u.created_at, NOW()),
    NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    name = COALESCE(profiles.name, EXCLUDED.name),
    role = COALESCE(profiles.role, EXCLUDED.role),
    updated_at = NOW();

-- ============================================
-- PARTE 3: VERIFICAR SE FUNCIONOU
-- ============================================
SELECT 
    u.email,
    p.name,
    p.role,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ Perfil criado/atualizado'
        ELSE '❌ FALHOU'
    END as status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id;

-- ============================================
-- PARTE 4: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- PARTE 5: CRIAR POLÍTICAS NOVAS E SIMPLES
-- ============================================

-- SELECT: Todos autenticados podem ver todos os perfis
CREATE POLICY "allow_select_all"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- INSERT: Usuário pode criar seu próprio perfil
CREATE POLICY "allow_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Usuário pode atualizar seu próprio perfil
CREATE POLICY "allow_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Admin pode atualizar qualquer perfil
CREATE POLICY "allow_update_admin"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- PARTE 6: REATIVAR RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 7: TESTAR ACESSO
-- ============================================

-- Contar perfis (deve retornar número > 0)
SELECT COUNT(*) as total_perfis FROM profiles;

-- Verificar políticas criadas
SELECT 
    policyname,
    cmd as comando,
    CASE 
        WHEN policyname LIKE '%select%' THEN '✅ SELECT criada'
        WHEN policyname LIKE '%insert%' THEN '✅ INSERT criada'
        WHEN policyname LIKE '%update%' THEN '✅ UPDATE criada'
        ELSE '✅ Política criada'
    END as status
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- ============================================
-- PARTE 8: GARANTIR TRIGGER EXISTE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'editor'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        updated_at = NOW();
        
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- MENSAGEM FINAL
-- ============================================
SELECT 
    '✅ CORREÇÃO FORÇADA EXECUTADA!' as status,
    'Perfis criados: ' || COUNT(*) as resultado
FROM profiles;