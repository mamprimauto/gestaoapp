-- CORREÇÃO DEFINITIVA DAS POLICIES RLS PARA kanban_columns
-- Execute este SQL no Supabase SQL Editor

-- 1. Primeiro, remover todas as policies antigas
DROP POLICY IF EXISTS "kanban_columns_insert_own" ON public.kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_select_own" ON public.kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_update_own" ON public.kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_delete_own" ON public.kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_insert_auth" ON public.kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_select_auth" ON public.kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_update_auth" ON public.kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_delete_auth" ON public.kanban_columns;

-- 2. Garantir que RLS está habilitado
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- 3. Criar policies corretas usando auth.uid()
-- Policy para SELECT - permite ler suas próprias colunas
CREATE POLICY "Users can view own kanban columns"
ON public.kanban_columns
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy para INSERT - permite criar colunas para si mesmo
CREATE POLICY "Users can insert own kanban columns"
ON public.kanban_columns
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy para UPDATE - permite atualizar suas próprias colunas
CREATE POLICY "Users can update own kanban columns"
ON public.kanban_columns
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy para DELETE - permite deletar suas próprias colunas
CREATE POLICY "Users can delete own kanban columns"
ON public.kanban_columns
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Verificar se as policies foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'kanban_columns';