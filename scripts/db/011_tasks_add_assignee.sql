-- Adiciona a coluna de responsável (assignee) nas tarefas
alter table if exists public.tasks
  add column if not exists assignee_id uuid null references public.profiles(id) on delete set null;

-- Índice para consultas por responsável
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);

-- Opcional: se você usa RLS, ajuste suas policies conforme o seu modelo.
-- Exemplo (mantenha suas policies existentes; este é apenas um guia):
-- create policy "select_own_tasks" on public.tasks
--   for select using (auth.uid() = user_id);
