-- Sistema de organizações para plataforma colaborativa
-- Transformar de individual para colaborativo (como Monday/ClickUp)

-- 1. Tabela de organizações/workspaces
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Membros da organização
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Índices para performance
create index if not exists idx_organizations_slug on public.organizations(slug);
create index if not exists idx_organizations_created_by on public.organizations(created_by);
create index if not exists idx_organization_members_org_id on public.organization_members(organization_id);
create index if not exists idx_organization_members_user_id on public.organization_members(user_id);

-- RLS para organizations
alter table public.organizations enable row level security;

-- Membros podem ver organizações que pertencem
drop policy if exists "organizations_select_members" on public.organizations;
create policy "organizations_select_members"
on public.organizations for select
using (
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = organizations.id 
    and om.user_id = auth.uid()
  )
);

-- Apenas admins podem criar organizações
drop policy if exists "organizations_insert_admin" on public.organizations;
create policy "organizations_insert_admin"
on public.organizations for insert
with check (auth.uid() = created_by);

-- Apenas admins da organização podem atualizar
drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
on public.organizations for update
using (
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = organizations.id 
    and om.user_id = auth.uid() 
    and om.role = 'admin'
  )
);

-- RLS para organization_members
alter table public.organization_members enable row level security;

-- Membros podem ver outros membros da mesma organização
drop policy if exists "org_members_select_same_org" on public.organization_members;
create policy "org_members_select_same_org"
on public.organization_members for select
using (
  exists (
    select 1 from public.organization_members om2 
    where om2.organization_id = organization_members.organization_id 
    and om2.user_id = auth.uid()
  )
);

-- Apenas admins podem adicionar membros
drop policy if exists "org_members_insert_admin" on public.organization_members;
create policy "org_members_insert_admin"
on public.organization_members for insert
with check (
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = organization_members.organization_id 
    and om.user_id = auth.uid() 
    and om.role = 'admin'
  )
);

-- Trigger para updated_at
drop trigger if exists trg_organizations_set_updated_at on public.organizations;
create trigger trg_organizations_set_updated_at
before update on public.organizations
for each row execute procedure public.set_updated_at();

-- Função para criar organização padrão quando um usuário se registra
create or replace function public.create_default_organization()
returns trigger
language plpgsql
security definer
as $$
declare
  org_id uuid;
  org_slug text;
begin
  -- Gera slug único baseado no email do usuário
  org_slug := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9]', '', 'g') || '-' || substr(new.id::text, 1, 8);
  
  -- Cria organização padrão
  insert into public.organizations (name, slug, created_by)
  values (
    'Minha Organização',
    org_slug,
    new.id
  )
  returning id into org_id;
  
  -- Adiciona o usuário como admin da organização
  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, new.id, 'admin');
  
  return new;
end;
$$;

-- Trigger para criar organização padrão automaticamente
-- NOTA: Este trigger será executado após profiles ser criado
-- drop trigger if exists trg_create_default_organization on public.profiles;
-- create trigger trg_create_default_organization
-- after insert on public.profiles
-- for each row execute procedure public.create_default_organization();