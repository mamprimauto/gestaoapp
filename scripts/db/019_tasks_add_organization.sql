-- Adicionar organization_id às tasks para sistema colaborativo
-- Migrar dados existentes para organização padrão

-- 1. Adicionar coluna organization_id às tasks
alter table public.tasks add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Índice para performance
create index if not exists idx_tasks_organization_id on public.tasks(organization_id);

-- 2. Função para migrar tasks existentes para organizações
create or replace function public.migrate_tasks_to_organizations()
returns void
language plpgsql
security definer
as $$
declare
  task_record record;
  org_id uuid;
begin
  -- Para cada task sem organization_id
  for task_record in 
    select id, user_id from public.tasks 
    where organization_id is null
  loop
    -- Encontra a organização do usuário (primeira organização como admin)
    select om.organization_id into org_id
    from public.organization_members om
    where om.user_id = task_record.user_id
    and om.role = 'admin'
    limit 1;
    
    -- Se encontrou organização, atualiza a task
    if org_id is not null then
      update public.tasks 
      set organization_id = org_id 
      where id = task_record.id;
    else
      -- Se não encontrou, cria organização para este usuário
      -- (caso fallback se o trigger não funcionou)
      insert into public.organizations (name, slug, created_by)
      values (
        'Organização Padrão',
        'default-' || substr(task_record.user_id::text, 1, 8),
        task_record.user_id
      )
      returning id into org_id;
      
      -- Adiciona usuário como admin
      insert into public.organization_members (organization_id, user_id, role)
      values (org_id, task_record.user_id, 'admin');
      
      -- Atualiza a task
      update public.tasks 
      set organization_id = org_id 
      where id = task_record.id;
    end if;
  end loop;
end;
$$;

-- 3. Remover políticas RLS antigas das tasks
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

-- 4. Novas políticas RLS colaborativas para tasks

-- SELECT: Membros da organização podem ver todas as tasks
create policy "tasks_select_org_members"
on public.tasks for select
using (
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
);

-- INSERT: Membros podem criar tasks na sua organização
create policy "tasks_insert_org_members"
on public.tasks for insert
with check (
  auth.uid() = user_id -- ainda precisa ser o criador
  and exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
);

-- UPDATE: Membros da organização podem atualizar tasks
-- (pode ser restringido para apenas criador + responsável se necessário)
create policy "tasks_update_org_members"
on public.tasks for update
using (
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
);

-- DELETE: Apenas criador ou admins podem deletar
create policy "tasks_delete_creator_or_admin"
on public.tasks for delete
using (
  auth.uid() = user_id -- criador
  or exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid() 
    and om.role = 'admin'
  )
);

-- 5. Função para executar migração manual
create or replace function public.execute_tasks_migration()
returns text
language plpgsql
security definer
as $$
begin
  perform public.migrate_tasks_to_organizations();
  return 'Migração de tasks concluída com sucesso';
end;
$$;

-- NOTA: Após executar este SQL, rode: SELECT public.execute_tasks_migration();