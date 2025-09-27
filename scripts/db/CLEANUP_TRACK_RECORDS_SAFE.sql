-- ⚠️ COMANDO SEGURO PARA LIMPAR TESTES A/B ⚠️
-- Este comando verifica se as tabelas existem antes de tentar limpá-las

BEGIN;

-- ========================================
-- LIMPAR APENAS TABELAS QUE EXISTEM
-- ========================================

-- Função para limpar tabela se ela existir
DO $$
DECLARE
    table_name TEXT;
    tables_to_clean TEXT[] := ARRAY[
        'track_record_assignment_notifications',
        'track_record_assignments', 
        'ab_test_comments',
        'ab_test_options',
        'track_record_comparisons',
        'track_record_attachments', 
        'track_record_learnings',
        'track_record_results',
        'track_record_kpis',
        'track_record_variations',
        'track_records'
    ];
BEGIN
    -- Desabilitar RLS primeiro
    FOREACH table_name IN ARRAY tables_to_clean
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'RLS desabilitado para: %', table_name;
        END IF;
    END LOOP;
    
    -- Limpar dados das tabelas que existem
    FOREACH table_name IN ARRAY tables_to_clean
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE', table_name);
            RAISE NOTICE 'Dados limpos de: %', table_name;
        ELSE
            RAISE NOTICE 'Tabela não existe: %', table_name;
        END IF;
    END LOOP;
    
    -- Reabilitar RLS
    FOREACH table_name IN ARRAY tables_to_clean
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'RLS reabilitado para: %', table_name;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ========================================
-- VERIFICAÇÃO FINAL - Mostrar contagens apenas de tabelas que existem
-- ========================================

DO $$
DECLARE
    table_name TEXT;
    tables_to_check TEXT[] := ARRAY['track_records', 'track_record_variations', 'track_record_kpis', 'ab_test_options'];
    query_text TEXT := '';
    first_table BOOLEAN := TRUE;
BEGIN
    -- Construir query dinamicamente apenas para tabelas que existem
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            IF NOT first_table THEN
                query_text := query_text || ' UNION ALL ';
            END IF;
            query_text := query_text || format('SELECT ''%s'' as tabela, COUNT(*) as registros_restantes FROM public.%I', table_name, table_name);
            first_table := FALSE;
        END IF;
    END LOOP;
    
    IF query_text != '' THEN
        query_text := query_text || ' ORDER BY tabela';
        RAISE NOTICE 'Executando verificação final...';
        EXECUTE query_text;
    ELSE
        RAISE NOTICE 'Nenhuma tabela de track records encontrada para verificar.';
    END IF;
END $$;