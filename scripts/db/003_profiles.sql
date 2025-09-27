-- Perfis sincronizados com auth.users
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'editor' check (role in ('admin','editor','copywriter','gestor_trafego','minerador')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

alter table public.profiles enable row level security;

-- Visibilidade: qualquer usuário autenticado pode ver todos os perfis
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles for select
using (auth.role() = 'authenticated');

-- Atualização: o próprio usuário pode alterar seu perfil
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (auth.uid() = id);

-- Atualização: administradores podem alterar qualquer perfil
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Não permitimos insert/delete direto do cliente; o insert é via trigger e delete só por admin via backend se necessário.

-- Trigger de updated_at
create or replace function public.profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.profiles_set_updated_at();

-- Trigger para espelhar novos usuários do Supabase em profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_name text;
  v_role text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'name', null);
  v_role := coalesce(new.raw_user_meta_data->>'role', 'editor');
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, v_name, v_role)
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        role = coalesce(excluded.role, public.profiles.role),
        updated_at = now();
  return new;
end;
$$;

-- Cria trigger no schema auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
