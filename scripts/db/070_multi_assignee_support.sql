-- Adicionar suporte a múltiplos responsáveis nas tarefas
-- Primeiro, criar uma tabela de ligação para múltiplos assignees

-- Criar tabela para múltiplos assignees
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, assignee_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_assignee_id ON task_assignees(assignee_id);

-- Migrar dados existentes de assignee_id para a nova tabela
INSERT INTO task_assignees (task_id, assignee_id)
SELECT id, assignee_id 
FROM tasks 
WHERE assignee_id IS NOT NULL
ON CONFLICT (task_id, assignee_id) DO NOTHING;

-- Políticas RLS para task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver assignees de tarefas que eles criaram, foram assignados ou fazem parte da organização
CREATE POLICY "task_assignees_select" ON task_assignees
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_assignees.task_id 
    AND (
      t.user_id = auth.uid() -- Criador da tarefa
      OR task_assignees.assignee_id = auth.uid() -- É assignee
      OR EXISTS (
        SELECT 1 FROM task_assignees ta2 
        WHERE ta2.task_id = t.id 
        AND ta2.assignee_id = auth.uid()
      ) -- É um dos assignees
    )
  )
);

-- Usuários podem inserir assignees em tarefas que criaram
CREATE POLICY "task_assignees_insert" ON task_assignees
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_assignees.task_id 
    AND t.user_id = auth.uid()
  )
);

-- Usuários podem atualizar assignees em tarefas que criaram
CREATE POLICY "task_assignees_update" ON task_assignees
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_assignees.task_id 
    AND t.user_id = auth.uid()
  )
);

-- Usuários podem deletar assignees em tarefas que criaram
CREATE POLICY "task_assignees_delete" ON task_assignees
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_assignees.task_id 
    AND t.user_id = auth.uid()
  )
);

-- Atualizar as políticas de tasks para incluir visibility para assignees
-- Primeiro, dropar políticas existentes
DROP POLICY IF EXISTS "tasks_select_own" ON tasks;

-- Nova política de SELECT que inclui tarefas onde o usuário é assignee
CREATE POLICY "tasks_select_visible" ON tasks
FOR SELECT USING (
  user_id = auth.uid() -- Criador da tarefa
  OR EXISTS (
    SELECT 1 FROM task_assignees ta 
    WHERE ta.task_id = tasks.id 
    AND ta.assignee_id = auth.uid()
  ) -- É assignee da tarefa
);

-- Comentários na tabela
COMMENT ON TABLE task_assignees IS 'Tabela de ligação para múltiplos responsáveis por tarefa';
COMMENT ON COLUMN task_assignees.task_id IS 'ID da tarefa';
COMMENT ON COLUMN task_assignees.assignee_id IS 'ID do usuário responsável';

-- Criar view para facilitar consultas de tarefas com seus assignees
CREATE OR REPLACE VIEW tasks_with_assignees AS
SELECT 
  t.*,
  -- Info do criador
  creator.name as created_by_name,
  creator.avatar_url as created_by_avatar,
  creator.email as created_by_email,
  -- Array de assignees
  COALESCE(
    array_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email,
        'avatar_url', p.avatar_url
      ) ORDER BY p.name
    ) FILTER (WHERE p.id IS NOT NULL),
    '{}'
  ) as assignees
FROM tasks t
LEFT JOIN profiles creator ON creator.id = t.user_id
LEFT JOIN task_assignees ta ON ta.task_id = t.id
LEFT JOIN profiles p ON p.id = ta.assignee_id
GROUP BY t.id, t.user_id, t.title, t.description, t.tag, t.owner, t.due_date, 
         t.status, t.priority, t.created_at, t.updated_at, t.assignee_id,
         t.kanban_column, t.organization_id, t.parent_id, t.variation_type,
         creator.name, creator.avatar_url, creator.email;

-- Comentário na view
COMMENT ON VIEW tasks_with_assignees IS 'View que inclui informações do criador e lista de assignees para cada tarefa';