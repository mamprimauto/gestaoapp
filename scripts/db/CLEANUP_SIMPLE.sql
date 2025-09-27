-- COMANDO SEGURO PARA LIMPAR TESTES A-B
-- Este comando verifica se as tabelas existem antes de tentar limpa-las

BEGIN;

-- Funcao para limpar tabela se ela existir
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
            RAISE NOTICE 'Tabela nao existe: %', table_name;
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

-- Verificacao final
SELECT 'track_records' as tabela, COUNT(*) as registros_restantes FROM public.track_records
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_records' AND table_schema = 'public')
UNION ALL
SELECT 'track_record_variations' as tabela, COUNT(*) as registros_restantes FROM public.track_record_variations
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_variations' AND table_schema = 'public')
UNION ALL  
SELECT 'track_record_kpis' as tabela, COUNT(*) as registros_restantes FROM public.track_record_kpis
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_kpis' AND table_schema = 'public')
ORDER BY tabela;