-- SOLUÇÃO DEFINITIVA PARA PROBLEMA DE RLS
-- Execute cada bloco separadamente se necessário

-- ============================================
-- BLOCO 1: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "tasks_select_org_members" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_org_members" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_org_members" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_creator_or_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_own_or_org" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own_or_org" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own_or_org" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own_or_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_simple" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_simple" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_simple" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_simple" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_temp_select_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_temp_insert_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_temp_update_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_temp_delete_authenticated" ON public.tasks;

-- ============================================
-- BLOCO 2: CRIAR POLÍTICAS SIMPLES
-- ============================================

-- POLÍTICA SELECT: Usuários veem suas próprias tasks
CREATE POLICY "tasks_select_own"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

-- POLÍTICA INSERT: Usuários criam suas próprias tasks  
CREATE POLICY "tasks_insert_own"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- POLÍTICA UPDATE: Usuários atualizam suas próprias tasks
CREATE POLICY "tasks_update_own"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

-- POLÍTICA DELETE: Usuários deletam suas próprias tasks
CREATE POLICY "tasks_delete_own"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- BLOCO 3: VERIFICAR RESULTADO
-- ============================================

-- Verificar se RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- Listar políticas criadas
SELECT 
    policyname,
    cmd as operacao
FROM pg_policies 
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- Contar tasks
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as tasks_sem_org,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as tasks_com_org
FROM public.tasks;

-- Status final
SELECT 'Políticas RLS aplicadas com sucesso!' as status;