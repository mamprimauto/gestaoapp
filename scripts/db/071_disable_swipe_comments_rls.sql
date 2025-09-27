-- Desabilitar RLS na tabela swipe_file_comments para sistema interno sem restrições de acesso

-- Remover todas as políticas existentes (caso existam)
drop policy if exists "swipe_file_comments_select_policy" on public.swipe_file_comments;
drop policy if exists "swipe_file_comments_insert_policy" on public.swipe_file_comments;
drop policy if exists "swipe_file_comments_update_policy" on public.swipe_file_comments;
drop policy if exists "swipe_file_comments_delete_policy" on public.swipe_file_comments;

-- Desabilitar RLS na tabela (se estiver habilitado)
alter table public.swipe_file_comments disable row level security;

-- Permitir acesso completo via service role (usado pela API)
grant all on public.swipe_file_comments to service_role;
grant all on public.swipe_file_comments to authenticated;
grant all on public.swipe_file_comments to anon;