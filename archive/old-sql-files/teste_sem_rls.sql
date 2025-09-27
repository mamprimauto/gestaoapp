-- TESTE: DESABILITAR RLS TEMPORARIAMENTE
-- ATENÇÃO: Só para teste! Reabilitar depois!

-- ============================================
-- OPÇÃO 1: DESABILITAR RLS COMPLETAMENTE (TESTE)
-- ============================================

-- Desabilitar RLS na tabela tasks
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT 
    'RLS DESABILITADO' as status,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- ============================================
-- OPÇÃO 2: SE PREFERIR MANTER RLS MAS COM POLÍTICA SUPER PERMISSIVA
-- ============================================

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;

-- Criar política que permite TUDO para usuários autenticados
CREATE POLICY "tasks_allow_all_authenticated"
ON public.tasks 
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- PARA REABILITAR RLS DEPOIS DO TESTE
-- ============================================

-- Execute isto depois de testar:
/*
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Recriar políticas normais
DROP POLICY IF EXISTS "tasks_allow_all_authenticated" ON public.tasks;

CREATE POLICY "tasks_select_own"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);
*/