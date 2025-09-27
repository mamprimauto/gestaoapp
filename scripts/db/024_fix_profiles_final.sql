-- Migration definitiva para corrigir políticas RLS de profiles
-- Remove TODAS as políticas antigas e cria uma única política funcional

-- 1. Remover TODAS as políticas antigas de profiles
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_same_org" on public.profiles;
drop policy if exists "profiles_select_all_authenticated" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

-- 2. Criar política SELECT única e simples
-- Qualquer usuário autenticado pode ver todos os profiles
create policy "profiles_select_authenticated"
on public.profiles for select
using (auth.role() = 'authenticated');

-- 3. Recriar política UPDATE - próprio usuário
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 4. Recriar política UPDATE - admins
create policy "profiles_update_admin"
on public.profiles for update
using (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- 5. Adicionar comentário explicativo
comment on policy "profiles_select_authenticated" on public.profiles is 
'Permite que qualquer usuário autenticado veja todos os profiles para colaboração';

comment on policy "profiles_update_own" on public.profiles is 
'Permite que usuários atualizem seu próprio profile';

comment on policy "profiles_update_admin" on public.profiles is 
'Permite que admins atualizem qualquer profile';

-- 6. Garantir que RLS está ativo
alter table public.profiles enable row level security;