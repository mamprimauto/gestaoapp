-- 🔧 CORREÇÃO PARA RETORNAR DADOS APÓS UPDATE
-- Execute este script no Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR POLÍTICAS ATUAIS
-- ============================================
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================
-- 2. REMOVER POLÍTICAS ANTIGAS DE SELECT
-- ============================================
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "allow_select_all" ON public.profiles;
DROP POLICY IF EXISTS "allow_read_all_profiles" ON public.profiles;

-- ============================================
-- 3. CRIAR POLÍTICA DE SELECT SIMPLES
-- ============================================
-- Todos os usuários autenticados podem ver todos os perfis
CREATE POLICY "authenticated_can_read_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 4. VERIFICAR POLÍTICAS DE UPDATE
-- ============================================
-- Remover políticas antigas conflitantes
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_any_profile" ON public.profiles;

-- ============================================
-- 5. CRIAR POLÍTICA UNIFICADA DE UPDATE
-- ============================================
-- Política única que permite:
-- 1. Usuário atualizar seu próprio perfil (exceto role)
-- 2. Admin atualizar qualquer perfil
CREATE POLICY "unified_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    -- Pode ver/acessar o registro se:
    -- 1. É o próprio perfil
    auth.uid() = id
    OR
    -- 2. É admin
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    -- Pode salvar alterações se:
    -- 1. É o próprio perfil e não está mudando o role
    (
        auth.uid() = id 
        AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    )
    OR
    -- 2. É admin (pode mudar qualquer coisa)
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- ============================================
-- 6. GARANTIR RLS ATIVO
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CRIAR FUNÇÃO PARA UPDATE COM RETORNO
-- ============================================
-- Função que garante retorno de dados após update
CREATE OR REPLACE FUNCTION public.update_profile_with_return(
    profile_id UUID,
    new_role TEXT,
    update_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar funções';
    END IF;
    
    -- Fazer o update
    UPDATE profiles 
    SET 
        role = new_role,
        updated_at = update_timestamp
    WHERE profiles.id = profile_id;
    
    -- Retornar o registro atualizado
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.name,
        p.role,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.id = profile_id;
END;
$$;

-- ============================================
-- 8. TESTAR A FUNÇÃO
-- ============================================
-- Teste: Ver se a função retorna dados corretamente
SELECT * FROM public.update_profile_with_return(
    'c9e6de2d-a0e9-48b9-8880-694b77bba330'::uuid, -- ID do Spectrum Digital
    'editor'
);

-- ============================================
-- 9. VERIFICAR RESULTADO FINAL
-- ============================================
SELECT 
    '✅ POLÍTICAS CORRIGIDAS!' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================
-- 10. LISTAR TODAS AS POLÍTICAS FINAIS
-- ============================================
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '👁️ Leitura'
        WHEN cmd = 'UPDATE' THEN '✏️ Atualização'
        WHEN cmd = 'INSERT' THEN '➕ Inserção'
        WHEN cmd = 'DELETE' THEN '🗑️ Exclusão'
    END as tipo
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;