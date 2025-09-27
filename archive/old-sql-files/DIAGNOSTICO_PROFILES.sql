-- 🔍 DIAGNÓSTICO COMPLETO DE PROFILES
-- Execute este script no Supabase SQL Editor para ver o estado atual

-- ============================================
-- 1. VERIFICAR SE RLS ESTÁ ATIVO
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ATIVO'
        ELSE '❌ RLS DESATIVADO'
    END as status
FROM pg_tables 
WHERE tablename = 'profiles';

-- ============================================
-- 2. LISTAR TODAS AS POLÍTICAS RLS
-- ============================================
SELECT 
    policyname,
    cmd,
    qual,
    with_check,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ Visualizar'
        WHEN 'INSERT' THEN '➕ Criar'
        WHEN 'UPDATE' THEN '✏️ Atualizar'
        WHEN 'DELETE' THEN '🗑️ Deletar'
        ELSE cmd
    END as acao
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================
-- 3. VERIFICAR USUÁRIOS E PERFIS
-- ============================================
SELECT 
    'Total de usuários em auth.users' as descricao,
    COUNT(*) as quantidade
FROM auth.users
UNION ALL
SELECT 
    'Total de perfis em profiles' as descricao,
    COUNT(*) as quantidade
FROM profiles
UNION ALL
SELECT 
    'Usuários SEM perfil' as descricao,
    COUNT(*) as quantidade
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ============================================
-- 4. LISTAR USUÁRIOS SEM PERFIL
-- ============================================
SELECT 
    u.id,
    u.email,
    u.created_at,
    '❌ SEM PERFIL' as status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
LIMIT 10;

-- ============================================
-- 5. VERIFICAR SEU USUÁRIO ESPECÍFICO
-- ============================================
-- Substitua pelo seu email real
SELECT 
    u.id,
    u.email,
    p.name,
    p.role,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ Perfil existe'
        ELSE '❌ Perfil NÃO existe'
    END as status_perfil,
    p.created_at as perfil_criado_em,
    p.updated_at as perfil_atualizado_em
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email IN (
    'spectrumdigitalbr@gmail.com',
    'igorzimpel@gmail.com',
    'igorxiles@gmail.com',
    'demo@trafficpro.local'
);

-- ============================================
-- 6. TESTAR PERMISSÕES RLS (SIMULAÇÃO)
-- ============================================
-- Este teste mostra o que um usuário específico pode ver

-- Primeiro, vamos ver todos os perfis (como admin/service role)
SELECT 
    'Total de perfis (admin view)' as teste,
    COUNT(*) as resultado
FROM profiles;

-- ============================================
-- 7. VERIFICAR ESTRUTURA DA TABELA
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 8. VERIFICAR TRIGGER PARA NOVOS USUÁRIOS
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- ============================================
-- 9. VERIFICAR FUNÇÃO DO TRIGGER
-- ============================================
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- ============================================
-- 10. RESULTADO FINAL
-- ============================================
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM profiles) 
        THEN '✅ TUDO OK: Todos usuários têm perfil'
        ELSE '❌ PROBLEMA: Faltam perfis para alguns usuários'
    END as diagnostico_final;