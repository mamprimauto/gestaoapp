-- 🚨 CORREÇÃO FORÇADA PARA PROFILES
-- Execute TUDO de uma vez no Supabase SQL Editor

-- ============================================
-- 1. DESABILITAR RLS COMPLETAMENTE
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. VERIFICAR E CORRIGIR DADOS
-- ============================================

-- Garantir que todos têm role
UPDATE profiles 
SET role = CASE
    WHEN role IS NULL OR role = '' THEN 'editor'
    ELSE role
END;

-- Garantir admin
UPDATE profiles 
SET role = 'admin'
WHERE email = 'igorzimpel@gmail.com';

-- Ver o estado atual
SELECT email, role FROM profiles ORDER BY email;

-- ============================================
-- 3. REMOVER TODAS AS POLÍTICAS
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
-- 4. CRIAR POLÍTICAS ULTRA SIMPLES
-- ============================================

-- Política única para SELECT
CREATE POLICY "allow_all_select"
ON public.profiles
FOR SELECT
USING (true);  -- Sem restrições

-- Política única para INSERT
CREATE POLICY "allow_own_insert"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Política única para UPDATE
CREATE POLICY "allow_all_update"  
ON public.profiles
FOR UPDATE
USING (true)  -- Todos podem acessar
WITH CHECK (
    -- Verificação simples
    auth.uid() = id 
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- ============================================
-- 5. REABILITAR RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. TESTAR UPDATE DIRETO
-- ============================================
-- Teste: Atualizar Spectrum Digital para admin
UPDATE profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'spectrumdigitalbr@gmail.com'
RETURNING *;

-- Reverter para editor
UPDATE profiles 
SET role = 'editor', updated_at = NOW()
WHERE email = 'spectrumdigitalbr@gmail.com'
RETURNING *;

-- ============================================
-- 7. VERIFICAR RESULTADO FINAL
-- ============================================
SELECT 
    '✅ CORREÇÃO APLICADA' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
FROM profiles;

-- Listar todos
SELECT 
    email,
    role,
    CASE role
        WHEN 'admin' THEN '👑 Admin'
        WHEN 'editor' THEN '📝 Editor'
        WHEN 'copywriter' THEN '✏️ Copywriter'
        ELSE role
    END as role_visual
FROM profiles
ORDER BY email;