-- Corrigir políticas de comentários para modo colaborativo sem organizações
-- Permite que todos os usuários autenticados vejam e adicionem comentários

-- =======================
-- TASK COMMENTS - Políticas Simplificadas
-- =======================

-- Remover todas as políticas antigas
drop policy if exists "task_comments_select_policy" on public.task_comments;
drop policy if exists "task_comments_insert_policy" on public.task_comments;
drop policy if exists "task_comments_update_policy" on public.task_comments;
drop policy if exists "task_comments_delete_policy" on public.task_comments;
drop policy if exists "task_comments_select_org_members" on public.task_comments;
drop policy if exists "task_comments_insert_org_members" on public.task_comments;
drop policy if exists "task_comments_update_author" on public.task_comments;
drop policy if exists "task_comments_delete_author_or_admin" on public.task_comments;

-- Nova política SELECT: Todos os usuários autenticados podem ver todos os comentários
create policy "task_comments_select_all_authenticated"
on public.task_comments for select
using (auth.role() = 'authenticated');

-- Nova política INSERT: Usuários autenticados podem criar comentários (com seu próprio user_id)
create policy "task_comments_insert_authenticated"
on public.task_comments for insert
with check (
  auth.role() = 'authenticated' 
  and auth.uid() = user_id
);

-- Nova política UPDATE: Usuários podem editar apenas seus próprios comentários
create policy "task_comments_update_own"
on public.task_comments for update
using (
  auth.role() = 'authenticated' 
  and auth.uid() = user_id
);

-- Nova política DELETE: Usuários podem deletar apenas seus próprios comentários
create policy "task_comments_delete_own"
on public.task_comments for delete
using (
  auth.role() = 'authenticated' 
  and auth.uid() = user_id
);

-- =======================
-- PROFILES - Garantir visibilidade
-- =======================

-- Remover políticas antigas de profiles
drop policy if exists "profiles_select_same_org" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;

-- Nova política: Todos os usuários autenticados podem ver todos os profiles
create policy "profiles_select_all_authenticated"
on public.profiles for select
using (auth.role() = 'authenticated');

-- Garantir que profiles podem ser atualizados pelo próprio usuário
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);