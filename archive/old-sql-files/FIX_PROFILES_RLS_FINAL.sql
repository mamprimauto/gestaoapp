-- 🔧 CORREÇÃO DEFINITIVA DAS POLÍTICAS RLS PARA PROFILES
-- Execute TODO este script de uma vez no Supabase SQL Editor

-- ============================================
-- 1. DESABILITAR RLS TEMPORARIAMENTE
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. REMOVER TODAS AS POLÍTICAS ANTIGAS
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
-- 3. CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
-- ============================================

-- Política de SELECT: Todos podem ver todos
CREATE POLICY "all_can_select"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Política de UPDATE: Todos podem tentar, mas com verificação
CREATE POLICY "all_can_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (true) -- Todos podem acessar
WITH CHECK (
    -- Mas só podem salvar se:
    auth.uid() = id -- É o próprio perfil
    OR
    auth.uid() IN ( -- Ou é admin
        SELECT id FROM profiles WHERE role = 'admin'
    )
);

-- Política de INSERT: Apenas o próprio usuário
CREATE POLICY "own_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. REABILITAR RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. GARANTIR QUE IGOR É ADMIN
-- ============================================
UPDATE profiles 
SET role = 'admin'
WHERE email = 'igorzimpel@gmail.com';

-- ============================================
-- 6. VERIFICAR RESULTADO
-- ============================================
SELECT 
    '✅ RLS CORRIGIDO!' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'profiles';

-- Listar políticas criadas
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '👁️ Ver todos'
        WHEN cmd = 'UPDATE' THEN '✏️ Admin pode editar'
        WHEN cmd = 'INSERT' THEN '➕ Próprio usuário'
    END as descricao
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;