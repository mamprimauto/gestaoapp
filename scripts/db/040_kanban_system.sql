-- Sistema Kanban: Colunas personalizáveis por workspace
-- Adiciona suporte para colunas customizáveis no sistema Kanban

-- 1. Adicionar campo kanban_column às tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS kanban_column text DEFAULT 'todo';

-- 2. Criar tabela para armazenar configuração de colunas por workspace
CREATE TABLE IF NOT EXISTS public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text NOT NULL, -- ID do workspace (copy, edicao, gestor, etc)
  column_id text NOT NULL, -- ID único da coluna (todo, in-progress, etc)
  title text NOT NULL, -- Nome da coluna
  color text NOT NULL, -- Cor da coluna (#hex)
  position integer NOT NULL DEFAULT 0, -- Ordem das colunas
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: uma coluna por workspace por usuário
  UNIQUE(user_id, workspace_id, column_id)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS kanban_columns_user_workspace_idx 
ON public.kanban_columns(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS tasks_kanban_column_idx 
ON public.tasks(kanban_column);

-- 4. RLS para kanban_columns
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuário só gerencia suas próprias colunas
DROP POLICY IF EXISTS "kanban_columns_select_own" ON public.kanban_columns;
CREATE POLICY "kanban_columns_select_own"
ON public.kanban_columns FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kanban_columns_insert_own" ON public.kanban_columns;
CREATE POLICY "kanban_columns_insert_own"
ON public.kanban_columns FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "kanban_columns_update_own" ON public.kanban_columns;
CREATE POLICY "kanban_columns_update_own"
ON public.kanban_columns FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kanban_columns_delete_own" ON public.kanban_columns;
CREATE POLICY "kanban_columns_delete_own"
ON public.kanban_columns FOR DELETE
USING (auth.uid() = user_id);

-- 5. Trigger de updated_at para kanban_columns
DROP TRIGGER IF EXISTS trg_kanban_columns_set_updated_at ON public.kanban_columns;
CREATE TRIGGER trg_kanban_columns_set_updated_at
BEFORE UPDATE ON public.kanban_columns
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 6. Inserir colunas padrão para workspaces existentes (opcional)
-- Isso será feito via aplicação para cada usuário conforme necessário