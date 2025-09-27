-- ========================================================
-- DESABILITAR RLS - VERSÃO SEGURA (verifica se tabelas existem)
-- ========================================================

-- 1. Mostrar tabelas que têm RLS ativo ANTES
SELECT 
    '🔒 TABELAS COM RLS ATIVO ATUALMENTE:' as info
UNION ALL
SELECT 
    '  - ' || tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY 1;

-- 2. Desabilitar RLS apenas em tabelas que existem
DO $$ 
DECLARE
    r RECORD;
    tabela_existe BOOLEAN;
BEGIN
    -- Lista de tabelas para verificar
    FOR r IN 
        SELECT unnest(ARRAY[
            'profiles',
            'tasks', 
            'kanban_columns',
            'organizations',
            'organization_members',
            'comments',
            'files',
            'task_assignees',
            'vault_passwords'
        ]) as tablename
    LOOP
        -- Verificar se a tabela existe
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = r.tablename
        ) INTO tabela_existe;
        
        -- Se existe, desabilitar RLS
        IF tabela_existe THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
            RAISE NOTICE '✅ RLS desabilitado em: %', r.tablename;
        ELSE
            RAISE NOTICE '⏭️ Tabela não existe, pulando: %', r.tablename;
        END IF;
    END LOOP;
END $$;

-- 3. Desabilitar RLS em QUALQUER outra tabela que exista e tenha RLS ativo
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE '✅ RLS desabilitado em: %', r.tablename;
    END LOOP;
END $$;

-- 4. Remover TODAS as políticas de TODAS as tabelas (se existirem)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT DISTINCT tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
            RAISE NOTICE '🗑️ Política removida: % da tabela %', pol.policyname, pol.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Não foi possível remover política % da tabela %', pol.policyname, pol.tablename;
        END;
    END LOOP;
END $$;

-- 5. Garantir permissões totais
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 6. RESULTADO FINAL - Verificar status
SELECT 
    '========================================' as separador
UNION ALL
SELECT 
    '📊 RESULTADO FINAL:' as info
UNION ALL
SELECT 
    '========================================' as separador;

-- Mostrar status de cada tabela
SELECT 
    tablename || ': ' || 
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DESABILITADO'
        ELSE '❌ RLS AINDA ATIVO'
    END as status_tabela
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Resumo final
SELECT 
    '========================================' as separador
UNION ALL
SELECT 
    CASE 
        WHEN COUNT(*) FILTER (WHERE rowsecurity = true) = 0 
        THEN '🎉 SUCESSO TOTAL! Nenhuma tabela tem RLS ativo!'
        ELSE '⚠️ ATENÇÃO: Ainda existem ' || COUNT(*) FILTER (WHERE rowsecurity = true)::text || ' tabelas com RLS ativo'
    END as resultado_final
FROM pg_tables 
WHERE schemaname = 'public';

-- Listar tabelas que ainda têm RLS (se houver)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 
        THEN '❌ Tabelas que ainda têm RLS ativo:'
        ELSE '✅ Nenhuma tabela com RLS ativo!'
    END as info
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

SELECT 
    '  - ' || tablename as tabela_com_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;