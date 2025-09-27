-- Checklist por tarefa com RLS por usuário da tarefa
create extension if not exists pgcrypto;

create table if not exists public.task_checklist (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_checklist_task_id_idx on public.task_checklist(task_id);
create index if not exists task_checklist_user_id_idx on public.task_checklist(user_id);

alter table public.task_checklist enable row level security;

-- Apenas o dono da tarefa pode ver itens da checklist
drop policy if exists "checklist_select_own_task" on public.task_checklist;
create policy "checklist_select_own_task"
on public.task_checklist for select
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and t.user_id = auth.uid()
  )
);

-- Insert: apenas o dono da tarefa pode inserir
drop policy if exists "checklist_insert_own_task" on public.task_checklist;
create policy "checklist_insert_own_task"
on public.task_checklist for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.user_id = auth.uid()
  )
);

-- Update/Delete: apenas o dono da tarefa pode alterar/remover
drop policy if exists "checklist_update_own_task" on public.task_checklist;
create policy "checklist_update_own_task"
on public.task_checklist for update
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and t.user_id = auth.uid()
  )
);

drop policy if exists "checklist_delete_own_task" on public.task_checklist;
create policy "checklist_delete_own_task"
on public.task_checklist for delete
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and t.user_id = auth.uid()
  )
);

-- Trigger updated_at
create or replace function public.task_checklist_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_task_checklist_set_updated_at on public.task_checklist;
create trigger trg_task_checklist_set_updated_at
before update on public.task_checklist
for each row execute procedure public.task_checklist_set_updated_at();
