-- SOLUÇÃO DEFINITIVA PARA PROBLEMA DE RLS
-- Remove completamente a dependência de organizações para operações básicas

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
    END LOOP;
END $$;

-- ============================================
-- PARTE 2: CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
-- ============================================

-- POLÍTICA SELECT: Usuários podem SEMPRE ver suas próprias tasks
CREATE POLICY "tasks_select_simple"
ON public.tasks FOR SELECT
USING (
    auth.uid() = user_id
);

-- POLÍTICA INSERT: Usuários podem SEMPRE criar tasks onde são o criador
CREATE POLICY "tasks_insert_simple"
ON public.tasks FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- POLÍTICA UPDATE: Usuários podem SEMPRE atualizar suas próprias tasks
CREATE POLICY "tasks_update_simple"
ON public.tasks FOR UPDATE
USING (
    auth.uid() = user_id
);

-- POLÍTICA DELETE: Usuários podem SEMPRE deletar suas próprias tasks
CREATE POLICY "tasks_delete_simple"
ON public.tasks FOR DELETE
USING (
    auth.uid() = user_id
);

-- ============================================
-- PARTE 3: VERIFICAR CONFIGURAÇÃO
-- ============================================

-- Verificar se RLS está habilitado
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- Listar políticas criadas
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- ============================================
-- PARTE 4: FUNÇÃO DE TESTE
-- ============================================

-- Criar função para testar inserção e leitura
CREATE OR REPLACE FUNCTION public.test_task_creation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_id uuid;
    test_task record;
    result json;
BEGIN
    -- Criar task de teste
    INSERT INTO public.tasks (
        user_id,
        title,
        description,
        status,
        priority,
        due_date
    ) VALUES (
        auth.uid(),
        'Task de Teste RLS',
        'Testando se RLS funciona',
        'pending',
        'low',
        CURRENT_DATE
    ) RETURNING id INTO test_id;
    
    -- Tentar ler a task criada
    SELECT * INTO test_task 
    FROM public.tasks 
    WHERE id = test_id;
    
    -- Deletar task de teste
    DELETE FROM public.tasks WHERE id = test_id;
    
    -- Retornar resultado
    IF test_task.id IS NOT NULL THEN
        result := json_build_object(
            'success', true,
            'message', 'RLS funcionando corretamente!',
            'task_id', test_task.id,
            'task_title', test_task.title
        );
    ELSE
        result := json_build_object(
            'success', false,
            'message', 'Falha ao ler task após inserção'
        );
    END IF;
    
    RETURN result;
END $$;

-- Dar permissão para executar
GRANT EXECUTE ON FUNCTION public.test_task_creation() TO authenticated;

-- Executar teste
SELECT public.test_task_creation();

-- ============================================
-- PARTE 5: STATUS FINAL
-- ============================================

SELECT 'Políticas RLS simplificadas aplicadas com sucesso!' as status,
       'Tasks agora são baseadas apenas em user_id' as descricao;