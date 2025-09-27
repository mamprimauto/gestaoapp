-- Migration para garantir que todas as tasks tenham organization_id
-- Corrige o problema de UPDATE retornar null devido a RLS

-- 1. Função para corrigir tasks sem organization_id
create or replace function public.fix_tasks_without_organization()
returns void
language plpgsql
security definer
as $$
declare
  task_record record;
  org_id uuid;
  tasks_fixed integer := 0;
begin
  -- Para cada task sem organization_id
  for task_record in 
    select id, user_id from public.tasks 
    where organization_id is null
  loop
    -- Encontra a organização do usuário
    select om.organization_id into org_id
    from public.organization_members om
    where om.user_id = task_record.user_id
    limit 1;
    
    -- Se encontrou organização, atualiza a task
    if org_id is not null then
      update public.tasks 
      set organization_id = org_id 
      where id = task_record.id;
      
      tasks_fixed := tasks_fixed + 1;
    else
      -- Se não encontrou, cria organização para este usuário
      insert into public.organizations (name, slug, created_by)
      values (
        'Organização Padrão',
        'org-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
        task_record.user_id
      )
      on conflict do nothing
      returning id into org_id;
      
      -- Se criou organização, adiciona usuário como admin
      if org_id is not null then
        insert into public.organization_members (organization_id, user_id, role)
        values (org_id, task_record.user_id, 'admin')
        on conflict do nothing;
        
        -- Atualiza a task
        update public.tasks 
        set organization_id = org_id 
        where id = task_record.id;
        
        tasks_fixed := tasks_fixed + 1;
      end if;
    end if;
  end loop;
  
  raise notice 'Tasks corrigidas: %', tasks_fixed;
end;
$$;

-- 2. Executar a correção
select public.fix_tasks_without_organization();

-- 3. Adicionar constraint para garantir que organization_id não seja null no futuro
-- (comentado por enquanto para não quebrar código existente)
-- alter table public.tasks alter column organization_id set not null;

-- 4. Melhorar política de UPDATE para incluir WITH CHECK
-- Isso garante que o SELECT após UPDATE funcione corretamente
drop policy if exists "tasks_update_org_members" on public.tasks;

create policy "tasks_update_org_members"
on public.tasks for update
using (
  -- Pode atualizar se é membro da organização
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
)
with check (
  -- Após atualizar, ainda precisa ser membro da organização
  exists (
    select 1 from public.organization_members om 
    where om.organization_id = tasks.organization_id 
    and om.user_id = auth.uid()
  )
);

-- 5. Criar índice para melhorar performance de queries com organization_id
create index if not exists idx_tasks_organization_user 
on public.tasks(organization_id, user_id);

-- 6. Função helper para debug de RLS
create or replace function public.debug_task_access(task_id uuid)
returns table(
  has_task boolean,
  has_organization boolean,
  is_member boolean,
  member_role text
)
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_role text;
begin
  -- Pegar o user_id atual
  v_user_id := auth.uid();
  
  -- Verificar se a task existe
  has_task := exists(select 1 from public.tasks where id = task_id);
  
  -- Pegar organization_id da task
  select organization_id into v_org_id 
  from public.tasks 
  where id = task_id;
  
  has_organization := v_org_id is not null;
  
  -- Verificar membership
  select role into v_role
  from public.organization_members
  where organization_id = v_org_id
  and user_id = v_user_id;
  
  is_member := v_role is not null;
  member_role := v_role;
  
  return next;
end;
$$;

-- Comentário para executar manualmente se necessário:
-- SELECT * FROM public.debug_task_access('seu-task-id-aqui');