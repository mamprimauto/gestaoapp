-- Solução definitiva para garantir que todas as tasks tenham organization_id

-- 1. Criar função para garantir que toda task tenha organization_id
create or replace function public.ensure_task_has_organization()
returns trigger
language plpgsql
security definer
as $$
declare
  org_id uuid;
begin
  -- Se já tem organization_id, não fazer nada
  if NEW.organization_id is not null then
    return NEW;
  end if;
  
  -- Buscar organization_id do usuário
  select om.organization_id into org_id
  from public.organization_members om
  where om.user_id = NEW.user_id
  limit 1;
  
  -- Se encontrou, usar essa organização
  if org_id is not null then
    NEW.organization_id := org_id;
    return NEW;
  end if;
  
  -- Se não encontrou, criar uma organização para o usuário
  insert into public.organizations (name, slug, created_by)
  values (
    'Organização de ' || NEW.user_id,
    'org-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
    NEW.user_id
  )
  returning id into org_id;
  
  -- Adicionar usuário como admin
  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, NEW.user_id, 'admin');
  
  -- Atribuir a organização à task
  NEW.organization_id := org_id;
  
  return NEW;
end;
$$;

-- 2. Criar trigger para INSERT
drop trigger if exists ensure_task_organization_on_insert on public.tasks;
create trigger ensure_task_organization_on_insert
before insert on public.tasks
for each row
execute function public.ensure_task_has_organization();

-- 3. Criar trigger para UPDATE (caso alguém tente limpar o organization_id)
drop trigger if exists ensure_task_organization_on_update on public.tasks;
create trigger ensure_task_organization_on_update
before update on public.tasks
for each row
when (NEW.organization_id is null and OLD.organization_id is not null)
execute function public.ensure_task_has_organization();

-- 4. Corrigir todas as tasks existentes de uma vez
DO $$
declare
  task_rec record;
  org_id uuid;
  fixed_count integer := 0;
begin
  -- Para cada task sem organization_id
  for task_rec in 
    select id, user_id 
    from public.tasks 
    where organization_id is null
  loop
    -- Buscar organization_id do usuário
    select om.organization_id into org_id
    from public.organization_members om
    where om.user_id = task_rec.user_id
    limit 1;
    
    -- Se não encontrou, criar organização
    if org_id is null then
      insert into public.organizations (name, slug, created_by)
      values (
        'Organização de ' || task_rec.user_id,
        'org-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
        task_rec.user_id
      )
      returning id into org_id;
      
      -- Adicionar usuário como admin
      insert into public.organization_members (organization_id, user_id, role)
      values (org_id, task_rec.user_id, 'admin');
    end if;
    
    -- Atualizar a task
    update public.tasks 
    set organization_id = org_id 
    where id = task_rec.id;
    
    fixed_count := fixed_count + 1;
  end loop;
  
  raise notice 'Tasks corrigidas: %', fixed_count;
end;
$$;

-- 5. Verificar resultado
select 
  count(*) as total_tasks,
  count(organization_id) as tasks_com_org,
  count(*) - count(organization_id) as tasks_sem_org
from public.tasks;

-- 6. Melhorar políticas RLS para garantir retorno após UPDATE
drop policy if exists "tasks_select_org_members" on public.tasks;
create policy "tasks_select_org_members"
on public.tasks for select
using (
  organization_id is not null 
  and exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
);

drop policy if exists "tasks_update_org_members" on public.tasks;
create policy "tasks_update_org_members"
on public.tasks for update
using (
  organization_id is not null
  and exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
)
with check (
  organization_id is not null
  and exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
);

-- 7. Política de INSERT com organization_id obrigatório
drop policy if exists "tasks_insert_org_members" on public.tasks;
create policy "tasks_insert_org_members"
on public.tasks for insert
with check (
  auth.uid() = user_id
  and organization_id is not null
  and exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
);