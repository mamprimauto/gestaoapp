-- ⚠️ COMANDO PARA LIMPAR TODOS OS DADOS ⚠️
-- Este comando vai DELETAR PERMANENTEMENTE todos os dados!
-- Execute no Supabase SQL Editor

BEGIN;

-- ========================================
-- LIMPAR TAREFAS E DADOS RELACIONADOS
-- ========================================

-- Remover comentários das tarefas
DELETE FROM public.task_comments WHERE true;
VACUUM public.task_comments;

-- Remover arquivos anexados às tarefas
DELETE FROM public.task_files WHERE true;
VACUUM public.task_files;

-- Remover checklists das tarefas
DELETE FROM public.task_checklist WHERE true;
VACUUM public.task_checklist;

-- Remover todas as tarefas (incluindo criativos)
DELETE FROM public.tasks WHERE true;
VACUUM public.tasks;

-- Remover colunas personalizadas do kanban
DELETE FROM public.kanban_columns WHERE true;
VACUUM public.kanban_columns;

-- ========================================
-- LIMPAR VAULT (SENHAS)
-- ========================================

-- Remover logs de acesso do vault
DELETE FROM public.vault_access_logs WHERE true;
VACUUM public.vault_access_logs;

-- Remover sessões ativas do vault
DELETE FROM public.vault_sessions WHERE true;
VACUUM public.vault_sessions;

-- Remover todos os itens do vault
DELETE FROM public.vault_items WHERE true;
VACUUM public.vault_items;

-- Remover configurações do vault
DELETE FROM public.vault_settings WHERE true;
VACUUM public.vault_settings;

-- ========================================
-- LIMPAR TESTES A/B (TRACK RECORDS) - ORDEM CORRETA
-- ========================================

-- 🔄 DESABILITAR RLS temporariamente para evitar bloqueios
DO $$
BEGIN
    -- Desabilitar RLS em todas as tabelas de track record
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_records') THEN
        ALTER TABLE public.track_records DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_variations') THEN
        ALTER TABLE public.track_record_variations DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_kpis') THEN
        ALTER TABLE public.track_record_kpis DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_results') THEN
        ALTER TABLE public.track_record_results DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_learnings') THEN
        ALTER TABLE public.track_record_learnings DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_attachments') THEN
        ALTER TABLE public.track_record_attachments DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_comparisons') THEN
        ALTER TABLE public.track_record_comparisons DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_assignments') THEN
        ALTER TABLE public.track_record_assignments DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_assignment_notifications') THEN
        ALTER TABLE public.track_record_assignment_notifications DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_test_comments') THEN
        ALTER TABLE public.ab_test_comments DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_test_options') THEN
        ALTER TABLE public.ab_test_options DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 🗑️ DELETAR DADOS EM ORDEM (dependências primeiro)

-- Remover notificações de atribuições (primeiro - sem dependências)
DELETE FROM public.track_record_assignment_notifications;

-- Remover atribuições dos track records
DELETE FROM public.track_record_assignments;

-- Remover comentários dos testes A/B
DELETE FROM public.ab_test_comments;

-- Remover opções dos testes A/B
DELETE FROM public.ab_test_options;

-- Remover comparações dos track records
DELETE FROM public.track_record_comparisons;

-- Remover anexos dos track records
DELETE FROM public.track_record_attachments;

-- Remover aprendizados dos track records
DELETE FROM public.track_record_learnings;

-- Remover resultados dos track records
DELETE FROM public.track_record_results;

-- Remover KPIs dos track records
DELETE FROM public.track_record_kpis;

-- Remover variações dos track records
DELETE FROM public.track_record_variations;

-- Remover track records principais (por último)
DELETE FROM public.track_records;

-- 🔄 REABILITAR RLS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_records') THEN
        ALTER TABLE public.track_records ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_variations') THEN
        ALTER TABLE public.track_record_variations ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_kpis') THEN
        ALTER TABLE public.track_record_kpis ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_results') THEN
        ALTER TABLE public.track_record_results ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_learnings') THEN
        ALTER TABLE public.track_record_learnings ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_attachments') THEN
        ALTER TABLE public.track_record_attachments ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_comparisons') THEN
        ALTER TABLE public.track_record_comparisons ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_assignments') THEN
        ALTER TABLE public.track_record_assignments ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_assignment_notifications') THEN
        ALTER TABLE public.track_record_assignment_notifications ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_test_comments') THEN
        ALTER TABLE public.ab_test_comments ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_test_options') THEN
        ALTER TABLE public.ab_test_options ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ========================================
-- FINALIZAR OPERAÇÃO
-- ========================================

COMMIT;

-- Mostrar estatísticas finais
SELECT 
  'tasks' as tabela, COUNT(*) as registros_restantes FROM public.tasks
UNION ALL
SELECT 
  'vault_items' as tabela, COUNT(*) as registros_restantes FROM public.vault_items
UNION ALL
SELECT 
  'track_records' as tabela, COUNT(*) as registros_restantes FROM public.track_records
ORDER BY tabela;