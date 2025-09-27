-- 🚨 CORREÇÃO DEFINITIVA PARA PROFILES - EXECUTE TUDO DE UMA VEZ
-- Este script resolve TODOS os problemas de RLS e políticas

-- ============================================
-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 2: LIMPAR TODAS AS POLÍTICAS ANTIGAS
-- ============================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Remover TODAS as políticas existentes
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
        RAISE NOTICE 'Removida política: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================
-- PASSO 3: GARANTIR QUE TODOS TÊM ROLE
-- ============================================
UPDATE profiles 
SET role = 'editor' 
WHERE role IS NULL OR role = '';

-- Garantir admin correto
UPDATE profiles 
SET role = 'admin'
WHERE email = 'igorzimpel@gmail.com';

-- ============================================
-- PASSO 4: CRIAR POLÍTICAS NOVAS E SIMPLES
-- ============================================

-- SELECT: Todos autenticados podem ver todos os profiles
CREATE POLICY "profiles_allow_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Usuário pode inserir seu próprio profile
CREATE POLICY "profiles_allow_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Usuário pode atualizar seu próprio profile OU admin pode atualizar qualquer um
CREATE POLICY "profiles_allow_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    -- Pode acessar se é o próprio OU é admin
    auth.uid() = id 
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    -- Pode salvar se é o próprio OU é admin
    auth.uid() = id 
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- DELETE: Apenas o próprio usuário (admin não deve deletar profiles)
CREATE POLICY "profiles_allow_delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- PASSO 5: REABILITAR RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 6: CRIAR FUNÇÃO HELPER PARA UPDATES
-- ============================================
CREATE OR REPLACE FUNCTION update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin BOOLEAN;
    updated_profile JSONB;
BEGIN
    -- Verificar se o usuário atual é admin
    SELECT role = 'admin' INTO is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar funções';
    END IF;
    
    -- Fazer o update
    UPDATE profiles
    SET 
        role = new_role,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Retornar o perfil atualizado
    SELECT to_jsonb(p.*) INTO updated_profile
    FROM profiles p
    WHERE p.id = target_user_id;
    
    RETURN updated_profile;
END;
$$;

-- Dar permissão para executar a função
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;

-- ============================================
-- PASSO 7: VERIFICAR RESULTADO
-- ============================================

-- Verificar políticas criadas
SELECT 
    '📋 POLÍTICAS CRIADAS' as titulo,
    COUNT(*) as total,
    string_agg(policyname || ' (' || cmd || ')', ', ') as politicas
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verificar se RLS está ativo
SELECT 
    '🔐 RLS STATUS' as titulo,
    CASE 
        WHEN rowsecurity THEN '✅ ATIVO' 
        ELSE '❌ INATIVO' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Verificar profiles
SELECT 
    '👥 PROFILES' as titulo,
    COUNT(*) as total,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'editor' THEN 1 END) as editors,
    COUNT(CASE WHEN role = 'copywriter' THEN 1 END) as copywriters
FROM profiles;

-- Listar todos os profiles
SELECT 
    email,
    role,
    CASE 
        WHEN role = 'admin' THEN '👑'
        WHEN role = 'editor' THEN '📝'
        WHEN role = 'copywriter' THEN '✏️'
        WHEN role = 'gestor_trafego' THEN '📊'
        WHEN role = 'minerador' THEN '⛏️'
        ELSE '👤'
    END || ' ' || role as role_visual,
    to_char(created_at, 'DD/MM/YYYY') as criado_em
FROM profiles
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1 
        ELSE 2 
    END,
    email;

-- ============================================
-- MENSAGEM FINAL
-- ============================================
SELECT 
    '✅ SCRIPT EXECUTADO COM SUCESSO!' as status,
    'Profiles configurados e RLS ativo' as mensagem,
    'Teste agora alterar uma função em /equipe' as acao;