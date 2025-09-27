-- Funções/enum e tabela de equipe com RLS por usuário criador
create extension if not exists pgcrypto;

-- Usaremos texto com constraint em vez de enum para flexibilidade
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin','editor','copywriter','gestor_trafego','minerador')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, email)
);

alter table public.team_members enable row level security;

drop policy if exists "team_select_own" on public.team_members;
create policy "team_select_own"
on public.team_members for select
using (auth.uid() = created_by);

drop policy if exists "team_insert_own" on public.team_members;
create policy "team_insert_own"
on public.team_members for insert
with check (auth.uid() = created_by);

drop policy if exists "team_update_own" on public.team_members;
create policy "team_update_own"
on public.team_members for update
using (auth.uid() = created_by);

drop policy if exists "team_delete_own" on public.team_members;
create policy "team_delete_own"
on public.team_members for delete
using (auth.uid() = created_by);

create or replace function public.team_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_team_set_updated_at on public.team_members;
create trigger trg_team_set_updated_at
before update on public.team_members
for each row execute procedure public.team_set_updated_at();
