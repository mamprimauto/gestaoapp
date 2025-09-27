-- 🚨 CORREÇÃO DE EMERGÊNCIA - PROFILES
-- Este script FORÇA o funcionamento removendo temporariamente o RLS

-- ============================================
-- OPÇÃO 1: DESABILITAR RLS COMPLETAMENTE (TEMPORÁRIO)
-- ============================================
-- Descomente a linha abaixo para desabilitar RLS completamente
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPÇÃO 2: POLÍTICAS PERMISSIVAS (RECOMENDADO)
-- ============================================

-- 1. Primeiro, garantir que RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas existentes
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT DISTINCT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
        RAISE NOTICE 'Removida política: %', pol.policyname;
    END LOOP;
END $$;

-- 3. Criar uma ÚNICA política super permissiva
CREATE POLICY "profiles_all_access"
ON public.profiles
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Verificar se funcionou
SELECT 
    '🔓 POLÍTICA PERMISSIVA CRIADA' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5. Testar acesso aos profiles
SELECT 
    id,
    email,
    role,
    CASE 
        WHEN role = 'admin' THEN '👑'
        WHEN role = 'editor' THEN '📝'
        WHEN role = 'copywriter' THEN '✏️'
        ELSE '👤'
    END || ' ' || COALESCE(role, 'sem role') as visual
FROM profiles
ORDER BY email;

-- 6. Garantir que igorzimpel é admin
UPDATE profiles 
SET role = 'admin'
WHERE email = 'igorzimpel@gmail.com';

-- 7. Verificar contagem
SELECT 
    '✅ PROFILES ACESSÍVEIS' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
FROM profiles;

-- ============================================
-- SE AINDA NÃO FUNCIONAR, EXECUTE ISTO:
-- ============================================
-- Esta é a opção nuclear - desabilita RLS completamente
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- SELECT '⚠️ RLS DESABILITADO - TODOS OS PROFILES ACESSÍVEIS' as aviso;