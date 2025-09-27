-- Atualizar políticas RLS para sistema colaborativo
-- Comments, Files e Time Tracking agora baseados na organização

-- =======================
-- 1. TASK COMMENTS
-- =======================

-- Remover políticas antigas
drop policy if exists "task_comments_select_policy" on public.task_comments;
drop policy if exists "task_comments_insert_policy" on public.task_comments;
drop policy if exists "task_comments_update_policy" on public.task_comments;
drop policy if exists "task_comments_delete_policy" on public.task_comments;

-- Nova política SELECT: Membros da organização podem ver comentários
create policy "task_comments_select_org_members"
on public.task_comments for select
using (
  exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_comments.task_id 
    and om.user_id = auth.uid()
  )
);

-- Nova política INSERT: Membros podem comentar em tasks da organização
create policy "task_comments_insert_org_members"
on public.task_comments for insert
with check (
  auth.uid() = user_id -- ainda precisa ser o autor do comentário
  and exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_comments.task_id 
    and om.user_id = auth.uid()
  )
);

-- Nova política UPDATE: Apenas autor do comentário pode editar
create policy "task_comments_update_author"
on public.task_comments for update
using (auth.uid() = user_id);

-- Nova política DELETE: Autor do comentário ou admins da organização
create policy "task_comments_delete_author_or_admin"
on public.task_comments for delete
using (
  auth.uid() = user_id -- autor do comentário
  or exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_comments.task_id 
    and om.user_id = auth.uid() 
    and om.role = 'admin'
  )
);

-- =======================
-- 2. TASK FILES
-- =======================

-- Remover políticas antigas
drop policy if exists "task_files_select_owner_or_assignee" on public.task_files;
drop policy if exists "task_files_insert_owner_or_assignee" on public.task_files;
drop policy if exists "task_files_update_owner_or_assignee" on public.task_files;
drop policy if exists "task_files_delete_owner_or_assignee" on public.task_files;

-- Nova política SELECT: Membros da organização podem ver arquivos
create policy "task_files_select_org_members"
on public.task_files for select
using (
  exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_files.task_id 
    and om.user_id = auth.uid()
  )
);

-- Nova política INSERT: Membros podem fazer upload em tasks da organização
create policy "task_files_insert_org_members"
on public.task_files for insert
with check (
  auth.uid() = uploaded_by -- ainda precisa ser o uploader
  and exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_files.task_id 
    and om.user_id = auth.uid()
  )
);

-- Nova política UPDATE: Membros da organização podem atualizar metadados
create policy "task_files_update_org_members"
on public.task_files for update
using (
  exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_files.task_id 
    and om.user_id = auth.uid()
  )
);

-- Nova política DELETE: Uploader ou admins da organização
create policy "task_files_delete_uploader_or_admin"
on public.task_files for delete
using (
  auth.uid() = uploaded_by -- quem fez upload
  or exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_files.task_id 
    and om.user_id = auth.uid() 
    and om.role = 'admin'
  )
);

-- =======================
-- 3. TASK TIME SESSIONS
-- =======================

-- Remover políticas antigas
drop policy if exists "time_sessions_select_own" on public.task_time_sessions;
drop policy if exists "time_sessions_insert_own" on public.task_time_sessions;
drop policy if exists "time_sessions_update_own" on public.task_time_sessions;
drop policy if exists "time_sessions_delete_own" on public.task_time_sessions;

-- Nova política SELECT: Membros podem ver sessões de tempo da organização
-- (cada usuário vê suas próprias sessões + estatísticas gerais)
create policy "time_sessions_select_org_members"
on public.task_time_sessions for select
using (
  -- Pode ver suas próprias sessões
  auth.uid() = user_id
  or
  -- Ou pode ver sessões de tasks da sua organização (para estatísticas)
  exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_time_sessions.task_id 
    and om.user_id = auth.uid()
  )
);

-- Nova política INSERT: Cada usuário cria suas próprias sessões
create policy "time_sessions_insert_own"
on public.task_time_sessions for insert
with check (
  auth.uid() = user_id -- ainda precisa ser o dono da sessão
  and exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_time_sessions.task_id 
    and om.user_id = auth.uid()
  )
);

-- Nova política UPDATE: Apenas dono da sessão
create policy "time_sessions_update_own"
on public.task_time_sessions for update
using (auth.uid() = user_id);

-- Nova política DELETE: Dono da sessão ou admins
create policy "time_sessions_delete_own_or_admin"
on public.task_time_sessions for delete
using (
  auth.uid() = user_id -- dono da sessão
  or exists (
    select 1 from public.tasks t
    inner join public.organization_members om on om.organization_id = t.organization_id
    where t.id = task_time_sessions.task_id 
    and om.user_id = auth.uid() 
    and om.role = 'admin'
  )
);

-- =======================
-- 4. TEAM MEMBERS (se ainda for usado)
-- =======================

-- Vamos manter team_members como está por enquanto
-- Pode ser deprecado em favor do sistema de organizações

-- =======================
-- 5. PROFILES (ajustar para organizações)
-- =======================

-- As profiles já funcionam bem, mas vamos garantir que membros da mesma org se vejam

-- Política para ver profiles de membros da mesma organização
drop policy if exists "profiles_select_same_org" on public.profiles;
create policy "profiles_select_same_org"
on public.profiles for select
using (
  -- Pode ver seu próprio profile
  auth.uid() = id
  or
  -- Ou profiles de membros da mesma organização
  exists (
    select 1 from public.organization_members om1
    inner join public.organization_members om2 on om1.organization_id = om2.organization_id
    where om1.user_id = auth.uid() 
    and om2.user_id = profiles.id
  )
);