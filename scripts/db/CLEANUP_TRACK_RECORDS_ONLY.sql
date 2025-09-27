-- ⚠️ COMANDO PARA LIMPAR APENAS OS TESTES A/B (TRACK RECORDS) ⚠️
-- Use este arquivo se os track records não foram completamente limpos

BEGIN;

-- ========================================
-- LIMPAR COMPLETAMENTE TODOS OS TRACK RECORDS
-- ========================================

-- 🔄 DESABILITAR RLS em TODAS as tabelas relacionadas
ALTER TABLE IF EXISTS public.track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_kpis DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_learnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_comparisons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_assignment_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_test_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_test_options DISABLE ROW LEVEL SECURITY;

-- 🗑️ DELETAR TODOS OS DADOS (sem WHERE para garantir limpeza total)
TRUNCATE TABLE public.track_record_assignment_notifications CASCADE;
TRUNCATE TABLE public.track_record_assignments CASCADE;
TRUNCATE TABLE public.ab_test_comments CASCADE;
TRUNCATE TABLE public.ab_test_options CASCADE;
TRUNCATE TABLE public.track_record_comparisons CASCADE;
TRUNCATE TABLE public.track_record_attachments CASCADE;
TRUNCATE TABLE public.track_record_learnings CASCADE;
TRUNCATE TABLE public.track_record_results CASCADE;
TRUNCATE TABLE public.track_record_kpis CASCADE;
TRUNCATE TABLE public.track_record_variations CASCADE;
TRUNCATE TABLE public.track_records CASCADE;

-- 🔄 REABILITAR RLS
ALTER TABLE IF EXISTS public.track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.track_record_assignment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_test_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_test_options ENABLE ROW LEVEL SECURITY;

-- ♻️ OTIMIZAR TABELAS APÓS LIMPEZA
VACUUM FULL public.track_records;
VACUUM FULL public.track_record_variations;
VACUUM FULL public.track_record_kpis;
VACUUM FULL public.track_record_results;
VACUUM FULL public.track_record_learnings;
VACUUM FULL public.track_record_attachments;
VACUUM FULL public.track_record_comparisons;
VACUUM FULL public.track_record_assignments;
VACUUM FULL public.track_record_assignment_notifications;
VACUUM FULL public.ab_test_comments;
VACUUM FULL public.ab_test_options;

COMMIT;

-- ========================================
-- VERIFICAÇÃO FINAL - DEVE RETORNAR 0 EM TUDO
-- ========================================

SELECT 
  'track_records' as tabela, COUNT(*) as registros_restantes 
FROM public.track_records
UNION ALL
SELECT 
  'track_record_variations' as tabela, COUNT(*) as registros_restantes 
FROM public.track_record_variations
UNION ALL
SELECT 
  'track_record_kpis' as tabela, COUNT(*) as registros_restantes 
FROM public.track_record_kpis
UNION ALL
SELECT 
  'ab_test_options' as tabela, COUNT(*) as registros_restantes 
FROM public.ab_test_options
ORDER BY tabela;