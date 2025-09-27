-- Adicionar campo due_date na tabela okr_tasks para sistema de prazos
-- Similar ao sistema de criativos

-- Adicionar coluna due_date se não existir
ALTER TABLE okr_tasks ADD COLUMN IF NOT EXISTS due_date DATE;

-- Comentário da coluna
COMMENT ON COLUMN okr_tasks.due_date IS 'Data limite para conclusão da tarefa OKR (formato YYYY-MM-DD)';

-- Índice para performance em consultas por data
CREATE INDEX IF NOT EXISTS idx_okr_tasks_due_date ON okr_tasks(due_date);

SELECT 'Campo due_date adicionado à tabela okr_tasks com sucesso!' as status;