-- Tabela para tracking de tempo gasto em tarefas/criativos
create table if not exists public.task_time_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para performance
create index if not exists idx_task_time_sessions_task_id on public.task_time_sessions(task_id);
create index if not exists idx_task_time_sessions_user_id on public.task_time_sessions(user_id);
create index if not exists idx_task_time_sessions_start_time on public.task_time_sessions(start_time);

-- Habilitar RLS
alter table public.task_time_sessions enable row level security;

-- Policies: cada usuário só lê/escreve suas próprias sessões de tempo
drop policy if exists "time_sessions_select_own" on public.task_time_sessions;
create policy "time_sessions_select_own"
on public.task_time_sessions for select
using (auth.uid() = user_id);

drop policy if exists "time_sessions_insert_own" on public.task_time_sessions;
create policy "time_sessions_insert_own"
on public.task_time_sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "time_sessions_update_own" on public.task_time_sessions;
create policy "time_sessions_update_own"
on public.task_time_sessions for update
using (auth.uid() = user_id);

drop policy if exists "time_sessions_delete_own" on public.task_time_sessions;
create policy "time_sessions_delete_own"
on public.task_time_sessions for delete
using (auth.uid() = user_id);

-- Trigger para updated_at
drop trigger if exists trg_task_time_sessions_set_updated_at on public.task_time_sessions;
create trigger trg_task_time_sessions_set_updated_at
before update on public.task_time_sessions
for each row execute procedure public.set_updated_at();

-- Função para calcular duration_seconds automaticamente
create or replace function public.calculate_session_duration()
returns trigger
language plpgsql
as $$
begin
  if new.end_time is not null and new.start_time is not null then
    new.duration_seconds = extract(epoch from (new.end_time - new.start_time))::integer;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_calculate_session_duration on public.task_time_sessions;
create trigger trg_calculate_session_duration
before insert or update on public.task_time_sessions
for each row execute procedure public.calculate_session_duration();