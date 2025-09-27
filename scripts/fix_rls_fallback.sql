-- Script para corrigir RLS e permitir acesso a tarefas antigas sem organização
-- Este script permite compatibilidade retroativa com tarefas criadas antes das organizações

-- =======================
-- 1. ADICIONAR POLÍTICAS DE FALLBACK PARA TASKS
-- =======================

-- Política SELECT: Ver tasks da organização OU suas próprias tasks antigas
drop policy if exists "tasks_select_org_or_own" on public.tasks;
create policy "tasks_select_org_or_own"
on public.tasks for select
using (
  -- Política nova: membros da organização podem ver tasks da org
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
  or
  -- Política fallback: pode ver suas próprias tasks antigas (sem organization_id)
  (auth.uid() = user_id and organization_id is null)
);

-- Política INSERT: Criar na organização OU como task pessoal
drop policy if exists "tasks_insert_org_or_own" on public.tasks;
create policy "tasks_insert_org_or_own"
on public.tasks for insert
with check (
  -- Pode criar na organização (se tem org)
  (
    auth.uid() = user_id 
    and organization_id is not null
    and exists (
      select 1 from public.organization_members om 
      where om.organization_id = tasks.organization_id 
      and om.user_id = auth.uid()
    )
  )
  or
  -- Ou pode criar task pessoal (sem org)
  (
    auth.uid() = user_id 
    and organization_id is null
  )
);

-- Política UPDATE: Atualizar tasks da organização OU suas próprias tasks antigas  
drop policy if exists "tasks_update_org_or_own" on public.tasks;
create policy "tasks_update_org_or_own"
on public.tasks for update
using (
  -- Pode atualizar tasks da organização
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
  or
  -- Ou suas próprias tasks antigas
  (auth.uid() = user_id and organization_id is null)
);

-- Política DELETE: Deletar como criador OU admin da organização
drop policy if exists "tasks_delete_org_or_own" on public.tasks;  
create policy "tasks_delete_org_or_own"
on public.tasks for delete
using (
  -- Criador pode deletar suas tasks
  auth.uid() = user_id
  or 
  -- Admin da organização pode deletar
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid() 
    and om.role = 'admin'
  )
);

-- =======================
-- 2. REMOVER POLÍTICAS ANTIGAS QUE SÓ FUNCIONAM COM ORG
-- =======================

-- Remover as políticas restritivas que exigem organização
drop policy if exists "tasks_select_org_members" on public.tasks;
drop policy if exists "tasks_insert_org_members" on public.tasks;
drop policy if exists "tasks_update_org_members" on public.tasks;
drop policy if exists "tasks_delete_creator_or_admin" on public.tasks;

-- Verificar políticas ativas
select 
  policyname,
  cmd,
  qual,
  with_check
from pg_policies 
where schemaname = 'public' 
and tablename = 'tasks'
order by policyname;