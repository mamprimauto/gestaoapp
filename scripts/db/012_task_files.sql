-- Metadados de arquivos de tarefas com RLS (dono/assignee)
create extension if not exists pgcrypto;

create table if not exists public.task_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_name text not null,
  path text not null, -- storage path (ex.: task-files/{task_id}/file.ext)
  size bigint not null,
  content_type text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists task_files_task_id_idx on public.task_files(task_id);
create index if not exists task_files_uploaded_by_idx on public.task_files(uploaded_by);

alter table public.task_files enable row level security;

-- Dono ou responsável pode ver
drop policy if exists "task_files_select_owner_or_assignee" on public.task_files;
create policy "task_files_select_owner_or_assignee"
on public.task_files for select
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (t.user_id = auth.uid() or t.assignee_id = auth.uid())
  )
);

-- Inserir: precisa ser dono ou assignee e ser o uploader
drop policy if exists "task_files_insert_owner_or_assignee" on public.task_files;
create policy "task_files_insert_owner_or_assignee"
on public.task_files for insert
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (t.user_id = auth.uid() or t.assignee_id = auth.uid())
  )
);

-- Atualizar/Excluir: dono ou assignee
drop policy if exists "task_files_update_owner_or_assignee" on public.task_files;
create policy "task_files_update_owner_or_assignee"
on public.task_files for update
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (t.user_id = auth.uid() or t.assignee_id = auth.uid())
  )
);

drop policy if exists "task_files_delete_owner_or_assignee" on public.task_files;
create policy "task_files_delete_owner_or_assignee"
on public.task_files for delete
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (t.user_id = auth.uid() or t.assignee_id = auth.uid())
  )
);
