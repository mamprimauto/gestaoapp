-- Tabela de comentários para tasks
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para performance
create index if not exists task_comments_task_id_idx on public.task_comments(task_id);
create index if not exists task_comments_user_id_idx on public.task_comments(user_id);
create index if not exists task_comments_created_at_idx on public.task_comments(created_at desc);

-- RLS (Row Level Security)
alter table public.task_comments enable row level security;

-- Política de visualização: usuários autenticados podem ver comentários das suas tasks
drop policy if exists "task_comments_select_policy" on public.task_comments;
create policy "task_comments_select_policy"
on public.task_comments for select
using (
  auth.role() = 'authenticated'
  and exists (
    select 1 from public.tasks t 
    where t.id = task_comments.task_id 
    and (t.user_id = auth.uid() or t.assignee_id = auth.uid())
  )
);

-- Política de inserção: usuários autenticados podem criar comentários em suas tasks
drop policy if exists "task_comments_insert_policy" on public.task_comments;
create policy "task_comments_insert_policy"
on public.task_comments for insert
with check (
  auth.role() = 'authenticated'
  and user_id = auth.uid()
  and exists (
    select 1 from public.tasks t 
    where t.id = task_comments.task_id 
    and (t.user_id = auth.uid() or t.assignee_id = auth.uid())
  )
);

-- Política de atualização: usuários podem editar apenas seus próprios comentários
drop policy if exists "task_comments_update_policy" on public.task_comments;
create policy "task_comments_update_policy"
on public.task_comments for update
using (
  auth.role() = 'authenticated'
  and user_id = auth.uid()
);

-- Política de exclusão: usuários podem excluir apenas seus próprios comentários
drop policy if exists "task_comments_delete_policy" on public.task_comments;
create policy "task_comments_delete_policy"
on public.task_comments for delete
using (
  auth.role() = 'authenticated'
  and user_id = auth.uid()
);

-- Trigger para updated_at
create or replace function public.task_comments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_task_comments_set_updated_at on public.task_comments;
create trigger trg_task_comments_set_updated_at
before update on public.task_comments
for each row execute procedure public.task_comments_set_updated_at();