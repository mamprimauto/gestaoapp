-- SOLUÇÃO DEFINITIVA PARA PROBLEMA DE RLS
-- Script para executar no Supabase SQL Editor

-- ============================================
-- PARTE 1: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================

-- Remover TODAS as políticas da tabela tasks
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tasks' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
        RAISE NOTICE 'Removida política: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================
-- PARTE 2: CRIAR POLÍTICAS ULTRA SIMPLES
-- ============================================

-- POLÍTICA SELECT: Usuários veem suas próprias tasks
CREATE POLICY "tasks_select_own"
ON public.tasks FOR SELECT
USING (
    auth.uid() = user_id
);

-- POLÍTICA INSERT: Usuários criam suas próprias tasks  
CREATE POLICY "tasks_insert_own"
ON public.tasks FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- POLÍTICA UPDATE: Usuários atualizam suas próprias tasks
CREATE POLICY "tasks_update_own"
ON public.tasks FOR UPDATE
USING (
    auth.uid() = user_id
);

-- POLÍTICA DELETE: Usuários deletam suas próprias tasks
CREATE POLICY "tasks_delete_own"
ON public.tasks FOR DELETE
USING (
    auth.uid() = user_id
);

-- ============================================
-- PARTE 3: POLÍTICAS PARA COLABORAÇÃO (OPCIONAL)
-- ============================================

-- Se tasks têm organization_id, permitir membros da organização verem
CREATE POLICY "tasks_select_org_members"
ON public.tasks FOR SELECT
USING (
    -- Se tem organização E usuário é membro
    (
        organization_id IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM public.organization_members om 
            WHERE om.organization_id = tasks.organization_id 
            AND om.user_id = auth.uid()
        )
    )
    OR
    -- Ou é o criador (já coberto pela política anterior mas por garantia)
    auth.uid() = user_id
);

-- ============================================
-- PARTE 4: VERIFICAR CONFIGURAÇÃO
-- ============================================

-- Verificar se RLS está habilitado
SELECT 
    'RLS Status' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- Listar todas as políticas criadas
SELECT 
    'Políticas Aplicadas' as info,
    policyname,
    cmd as operacao,
    CASE 
        WHEN qual IS NOT NULL THEN 'Tem condição SELECT/UPDATE/DELETE'
        ELSE 'Sem condição SELECT/UPDATE/DELETE'
    END as condicao_select,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Tem condição INSERT/UPDATE'
        ELSE 'Sem condição INSERT/UPDATE'
    END as condicao_insert
FROM pg_policies 
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- ============================================
-- PARTE 5: CRIAR FUNÇÃO DE DEBUG
-- ============================================

-- Função para verificar se usuário consegue ver suas tasks
CREATE OR REPLACE FUNCTION public.debug_user_tasks(user_email text)
RETURNS TABLE(
    user_id uuid,
    user_email text,
    total_tasks bigint,
    tasks_with_org bigint,
    tasks_without_org bigint,
    recent_task_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email as user_email,
        COUNT(t.id) as total_tasks,
        COUNT(t.organization_id) as tasks_with_org,
        COUNT(CASE WHEN t.organization_id IS NULL THEN 1 END) as tasks_without_org,
        MAX(t.title) as recent_task_title
    FROM auth.users u
    LEFT JOIN public.tasks t ON t.user_id = u.id
    WHERE u.email = debug_user_tasks.user_email
    GROUP BY u.id, u.email;
END $$;

-- Dar permissão
GRANT EXECUTE ON FUNCTION public.debug_user_tasks(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_tasks(text) TO anon;
GRANT EXECUTE ON FUNCTION public.debug_user_tasks(text) TO service_role;

-- ============================================
-- PARTE 6: VERIFICAR USUÁRIOS E TASKS
-- ============================================

-- Ver quantos usuários e tasks existem
SELECT 
    'Estatísticas do Sistema' as info,
    (SELECT COUNT(*) FROM auth.users) as total_usuarios,
    (SELECT COUNT(*) FROM public.tasks) as total_tasks,
    (SELECT COUNT(*) FROM public.tasks WHERE organization_id IS NULL) as tasks_sem_org,
    (SELECT COUNT(*) FROM public.tasks WHERE organization_id IS NOT NULL) as tasks_com_org;

-- Ver últimas 5 tasks criadas
SELECT 
    'Últimas Tasks' as info,
    id,
    title,
    user_id,
    organization_id,
    created_at
FROM public.tasks
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- PARTE 7: STATUS FINAL
-- ============================================

SELECT '✅ Políticas RLS Corrigidas!' as status,
       'Tasks agora funcionam com user_id simples' as descricao,
       'Execute debug_user_tasks(''seu-email@exemplo.com'') para verificar' as teste;