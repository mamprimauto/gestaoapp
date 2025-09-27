-- ========================================================
-- DESABILITAR RLS COMPLETAMENTE EM TODAS AS TABELAS
-- ========================================================
-- ATENÇÃO: Isso remove toda a segurança de nível de linha
-- Use apenas se você confia em todos os usuários do sistema
-- ========================================================

-- 1. Listar todas as tabelas com RLS habilitado ANTES
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    '🔒 RLS Ativo' as status_antes
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- 2. DESABILITAR RLS EM TODAS AS TABELAS PRINCIPAIS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_passwords DISABLE ROW LEVEL SECURITY;

-- 3. Desabilitar em qualquer outra tabela que possa existir
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
        RAISE NOTICE 'RLS desabilitado em: %.%', r.schemaname, r.tablename;
    END LOOP;
END $$;

-- 4. Remover TODAS as políticas existentes (limpeza completa)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Política removida: % em %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- 5. Garantir permissões totais para todos os roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 6. Verificar que RLS está DESABILITADO em todas as tabelas
SELECT 
    '===== RESULTADO FINAL =====' as info
UNION ALL
SELECT 
    tablename || ': ' || 
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DESABILITADO'
        ELSE '❌ RLS ainda ativo - PROBLEMA!'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY 1;

-- 7. Contar tabelas com RLS
SELECT 
    COUNT(*) FILTER (WHERE rowsecurity = true) as tabelas_com_rls,
    COUNT(*) FILTER (WHERE rowsecurity = false) as tabelas_sem_rls,
    COUNT(*) as total_tabelas,
    CASE 
        WHEN COUNT(*) FILTER (WHERE rowsecurity = true) = 0 
        THEN '🎉 SUCESSO! RLS completamente desabilitado!'
        ELSE '⚠️ AINDA HÁ TABELAS COM RLS ATIVO!'
    END as resultado
FROM pg_tables 
WHERE schemaname = 'public';

-- ========================================================
-- FIM - RLS DEVE ESTAR COMPLETAMENTE DESABILITADO
-- ========================================================