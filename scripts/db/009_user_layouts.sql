-- Preferências de layout por usuário e rota
create extension if not exists pgcrypto;

create table if not exists public.user_layouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  config jsonb not null, -- ex: {"order":["greeting","tasks"], "version":1}
  updated_at timestamptz not null default now(),
  primary key (user_id, route)
);

alter table public.user_layouts enable row level security;

-- Seleciona apenas do próprio usuário
drop policy if exists "user_layouts_select_own" on public.user_layouts;
create policy "user_layouts_select_own"
on public.user_layouts for select
using (auth.uid() = user_id);

-- Inserir apenas para si mesmo
drop policy if exists "user_layouts_insert_own" on public.user_layouts;
create policy "user_layouts_insert_own"
on public.user_layouts for insert
with check (auth.uid() = user_id);

-- Atualizar apenas o próprio registro
drop policy if exists "user_layouts_update_own" on public.user_layouts;
create policy "user_layouts_update_own"
on public.user_layouts for update
using (auth.uid() = user_id);

-- Trigger updated_at
create or replace function public.user_layouts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_layouts_set_updated_at on public.user_layouts;
create trigger trg_user_layouts_set_updated_at
before update on public.user_layouts
for each row execute procedure public.user_layouts_set_updated_at();
