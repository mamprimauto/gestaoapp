-- Habilitar comentários colaborativos removendo restrições de organização
-- Permite que todos os usuários autenticados interajam com comentários em todas as tarefas

-- =======================
-- TASK COMMENTS - Políticas Colaborativas Abertas
-- =======================

-- Remover todas as políticas antigas de comentários
drop policy if exists "task_comments_select_policy" on public.task_comments;
drop policy if exists "task_comments_insert_policy" on public.task_comments;
drop policy if exists "task_comments_update_policy" on public.task_comments;
drop policy if exists "task_comments_delete_policy" on public.task_comments;
drop policy if exists "task_comments_select_org_members" on public.task_comments;
drop policy if exists "task_comments_insert_org_members" on public.task_comments;
drop policy if exists "task_comments_update_author" on public.task_comments;
drop policy if exists "task_comments_delete_author_or_admin" on public.task_comments;
drop policy if exists "task_comments_select_all_authenticated" on public.task_comments;
drop policy if exists "task_comments_insert_authenticated" on public.task_comments;
drop policy if exists "task_comments_update_own" on public.task_comments;
drop policy if exists "task_comments_delete_own" on public.task_comments;

-- Garantir que RLS está habilitado
alter table public.task_comments enable row level security;

-- SELECT: Todos os usuários autenticados podem ver todos os comentários
create policy "comments_select_authenticated"
on public.task_comments for select
using (auth.role() = 'authenticated');

-- INSERT: Usuários autenticados podem criar comentários
create policy "comments_insert_authenticated"
on public.task_comments for insert
with check (
  auth.role() = 'authenticated' 
  and auth.uid() = user_id
);

-- UPDATE: Usuários podem editar seus próprios comentários
create policy "comments_update_own"
on public.task_comments for update
using (
  auth.role() = 'authenticated' 
  and auth.uid() = user_id
);

-- DELETE: Usuários podem deletar seus próprios comentários
create policy "comments_delete_own"
on public.task_comments for delete
using (
  auth.role() = 'authenticated' 
  and auth.uid() = user_id
);

-- =======================
-- TASKS - Políticas Colaborativas
-- =======================

-- Remover políticas antigas de tasks
drop policy if exists "tasks_select_policy" on public.tasks;
drop policy if exists "tasks_insert_policy" on public.tasks;
drop policy if exists "tasks_update_policy" on public.tasks;
drop policy if exists "tasks_delete_policy" on public.tasks;
drop policy if exists "tasks_select_org_members" on public.tasks;
drop policy if exists "tasks_insert_org_members" on public.tasks;
drop policy if exists "tasks_update_org_members" on public.tasks;
drop policy if exists "tasks_delete_org_admins" on public.tasks;

-- Garantir que RLS está habilitado
alter table public.tasks enable row level security;

-- SELECT: Todos os usuários autenticados podem ver todas as tarefas
create policy "tasks_select_authenticated"
on public.tasks for select
using (auth.role() = 'authenticated');

-- INSERT: Usuários autenticados podem criar tarefas
create policy "tasks_insert_authenticated"
on public.tasks for insert
with check (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

-- UPDATE: Usuários podem atualizar qualquer tarefa (colaborativo)
create policy "tasks_update_authenticated"
on public.tasks for update
using (auth.role() = 'authenticated');

-- DELETE: Apenas o criador pode deletar
create policy "tasks_delete_owner"
on public.tasks for delete
using (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

-- =======================
-- PROFILES - Visibilidade Total
-- =======================

-- Remover políticas antigas de profiles
drop policy if exists "profiles_select_same_org" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_select_all_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;

-- Garantir que RLS está habilitado
alter table public.profiles enable row level security;

-- SELECT: Todos os usuários autenticados podem ver todos os profiles
create policy "profiles_select_authenticated"
on public.profiles for select
using (auth.role() = 'authenticated');

-- INSERT: Usuários podem criar seu próprio profile
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

-- UPDATE: Usuários podem atualizar seu próprio profile
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

-- =======================
-- TASK FILES - Acesso Colaborativo
-- =======================

-- Remover políticas antigas
drop policy if exists "task_files_select_owner_or_assignee" on public.task_files;
drop policy if exists "task_files_insert_owner_or_assignee" on public.task_files;
drop policy if exists "task_files_update_owner_or_assignee" on public.task_files;
drop policy if exists "task_files_delete_owner_or_assignee" on public.task_files;
drop policy if exists "task_files_select_org_members" on public.task_files;
drop policy if exists "task_files_insert_org_members" on public.task_files;
drop policy if exists "task_files_update_org_members" on public.task_files;
drop policy if exists "task_files_delete_uploader_or_admin" on public.task_files;

-- Garantir que RLS está habilitado
alter table public.task_files enable row level security;

-- SELECT: Todos podem ver arquivos
create policy "files_select_authenticated"
on public.task_files for select
using (auth.role() = 'authenticated');

-- INSERT: Usuários autenticados podem fazer upload
create policy "files_insert_authenticated"
on public.task_files for insert
with check (
  auth.role() = 'authenticated'
  and auth.uid() = uploaded_by
);

-- UPDATE: Qualquer usuário autenticado pode atualizar metadados
create policy "files_update_authenticated"
on public.task_files for update
using (auth.role() = 'authenticated');

-- DELETE: Apenas quem fez upload pode deletar
create policy "files_delete_uploader"
on public.task_files for delete
using (
  auth.role() = 'authenticated'
  and auth.uid() = uploaded_by
);

-- =======================
-- CONFIRMAÇÃO
-- =======================

-- Mensagem de confirmação
do $$
begin
  raise notice 'Políticas colaborativas aplicadas com sucesso!';
  raise notice 'Todos os usuários autenticados agora podem:';
  raise notice '- Ver e comentar em todas as tarefas';
  raise notice '- Ver todos os profiles';
  raise notice '- Colaborar em tarefas de qualquer departamento';
end $$;