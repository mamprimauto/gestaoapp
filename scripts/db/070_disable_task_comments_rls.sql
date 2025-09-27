-- Desabilitar RLS na tabela task_comments para sistema interno sem restrições de acesso

-- Remover todas as políticas existentes
drop policy if exists "task_comments_select_policy" on public.task_comments;
drop policy if exists "task_comments_insert_policy" on public.task_comments;
drop policy if exists "task_comments_update_policy" on public.task_comments;
drop policy if exists "task_comments_delete_policy" on public.task_comments;

-- Desabilitar RLS na tabela
alter table public.task_comments disable row level security;

-- Permitir acesso completo via service role (usado pela API)
grant all on public.task_comments to service_role;
grant all on public.task_comments to authenticated;
grant all on public.task_comments to anon;