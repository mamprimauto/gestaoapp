-- 🔧 SCRIPT SIMPLIFICADO - EXECUTE CADA PARTE SEPARADAMENTE

-- ============================================
-- PARTE 1: LIMPAR POLÍTICAS ANTIGAS
-- ============================================
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "allow_select_all" ON public.profiles;
DROP POLICY IF EXISTS "allow_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_any_profile" ON public.profiles;

-- ============================================
-- PARTE 2: CRIAR POLÍTICA DE LEITURA
-- ============================================
CREATE POLICY "authenticated_can_read_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PARTE 3: CRIAR POLÍTICA DE UPDATE
-- ============================================
CREATE POLICY "unified_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    -- Pode ver/acessar o registro se:
    auth.uid() = id
    OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    -- Pode salvar alterações se:
    (
        auth.uid() = id 
        AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- ============================================
-- PARTE 4: GARANTIR RLS ATIVO
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 5: VERIFICAR RESULTADO
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