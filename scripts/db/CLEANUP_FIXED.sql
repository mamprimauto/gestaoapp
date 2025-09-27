-- COMANDO SEGURO PARA LIMPAR TESTES A-B
-- Este comando verifica se as tabelas existem antes de tentar limpa-las

BEGIN;

-- Funcao para limpar tabela se ela existir
DO $$
DECLARE
    tbl_name TEXT;
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
    FOREACH tbl_name IN ARRAY tables_to_clean
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl_name);
            RAISE NOTICE 'RLS desabilitado para: %', tbl_name;
        END IF;
    END LOOP;
    
    -- Limpar dados das tabelas que existem
    FOREACH tbl_name IN ARRAY tables_to_clean
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE', tbl_name);
            RAISE NOTICE 'Dados limpos de: %', tbl_name;
        ELSE
            RAISE NOTICE 'Tabela nao existe: %', tbl_name;
        END IF;
    END LOOP;
    
    -- Reabilitar RLS
    FOREACH tbl_name IN ARRAY tables_to_clean
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
            RAISE NOTICE 'RLS reabilitado para: %', tbl_name;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- Verificacao final das tabelas principais
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_records' AND table_schema = 'public') THEN
        PERFORM COUNT(*) FROM public.track_records;
        RAISE NOTICE 'track_records tem % registros', (SELECT COUNT(*) FROM public.track_records);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_variations' AND table_schema = 'public') THEN
        PERFORM COUNT(*) FROM public.track_record_variations;
        RAISE NOTICE 'track_record_variations tem % registros', (SELECT COUNT(*) FROM public.track_record_variations);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_test_options' AND table_schema = 'public') THEN
        PERFORM COUNT(*) FROM public.ab_test_options;
        RAISE NOTICE 'ab_test_options tem % registros', (SELECT COUNT(*) FROM public.ab_test_options);
    END IF;
END $$;