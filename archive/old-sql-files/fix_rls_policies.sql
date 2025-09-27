-- Script para corrigir políticas RLS que impedem leitura de tasks criadas
-- Problema: Políticas muito restritivas impedem usuários de verem suas próprias tasks

-- =======================
-- 1. BACKUP DAS POLÍTICAS ATUAIS
-- =======================

-- Listar políticas atuais para backup
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'tasks'
ORDER BY policyname;

-- =======================
-- 2. REMOVER POLÍTICAS PROBLEMÁTICAS
-- =======================

drop policy if exists "tasks_select_org_members" on public.tasks;
drop policy if exists "tasks_insert_org_members" on public.tasks;
drop policy if exists "tasks_update_org_members" on public.tasks;
drop policy if exists "tasks_delete_creator_or_admin" on public.tasks;

-- =======================
-- 3. CRIAR POLÍTICAS MAIS PERMISSIVAS E FUNCIONAIS
-- =======================

-- SELECT: Usuários podem ver:
-- 1. Suas próprias tasks (sempre)
-- 2. Tasks da sua organização (se for membro)
-- 3. Tasks sem organização (fallback para compatibilidade)
create policy "tasks_select_own_or_org"
on public.tasks for select
using (
  -- Pode ver suas próprias tasks
  auth.uid() = user_id
  or
  -- Pode ver tasks da sua organização
  (
    organization_id is not null
    and exists (
      select 1 from public.organization_members om 
      where om.organization_id = tasks.organization_id 
      and om.user_id = auth.uid()
    )
  )
  or
  -- Fallback: pode ver tasks sem organização se for o criador (compatibilidade)
  (organization_id is null and auth.uid() = user_id)
);

-- INSERT: Usuários podem criar tasks se:
-- 1. São o criador da task (sempre)
-- 2. A task tem organização E são membros da organização
-- 3. A task não tem organização (fallback)
create policy "tasks_insert_own_or_org"
on public.tasks for insert
with check (
  auth.uid() = user_id -- sempre deve ser o criador
  and (
    -- Task com organização: deve ser membro
    (
      organization_id is not null
      and exists (
        select 1 from public.organization_members om 
        where om.organization_id = tasks.organization_id 
        and om.user_id = auth.uid()
      )
    )
    or
    -- Task sem organização: permitir (fallback)
    organization_id is null
  )
);

-- UPDATE: Usuários podem atualizar:
-- 1. Suas próprias tasks (sempre)  
-- 2. Tasks da sua organização (se for membro)
create policy "tasks_update_own_or_org"
on public.tasks for update
using (
  -- Pode atualizar suas próprias tasks
  auth.uid() = user_id
  or
  -- Pode atualizar tasks da sua organização
  (
    organization_id is not null
    and exists (
      select 1 from public.organization_members om 
      where om.organization_id = tasks.organization_id 
      and om.user_id = auth.uid()
    )
  )
);

-- DELETE: Usuários podem deletar:
-- 1. Suas próprias tasks (sempre)
-- 2. Tasks da organização se forem admin
create policy "tasks_delete_own_or_admin"
on public.tasks for delete
using (
  -- Pode deletar suas próprias tasks
  auth.uid() = user_id
  or
  -- Admins podem deletar tasks da organização
  (
    organization_id is not null
    and exists (
      select 1 from public.organization_members om 
      where om.organization_id = tasks.organization_id 
      and om.user_id = auth.uid() 
      and om.role = 'admin'
    )
  )
);

-- =======================
-- 4. GARANTIR QUE TODOS OS USUÁRIOS TENHAM ORGANIZAÇÃO
-- =======================

-- Função para criar organização padrão se não existir
create or replace function public.ensure_user_has_organization()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
  user_email text;
  org_id uuid;
begin
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  if current_user_id is null then
    return; -- Usuário não autenticado
  end if;
  
  -- Verificar se já tem organização
  if exists (
    select 1 from public.organization_members om 
    where om.user_id = current_user_id
  ) then
    return; -- Já tem organização
  end if;
  
  -- Obter email do usuário
  select email into user_email from auth.users where id = current_user_id;
  
  -- Criar organização padrão
  insert into public.organizations (name, slug, created_by)
  values (
    coalesce('Organização de ' || user_email, 'Organização Padrão'),
    'org-' || substr(current_user_id::text, 1, 8),
    current_user_id
  )
  returning id into org_id;
  
  -- Adicionar usuário como admin
  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, current_user_id, 'admin');
  
  -- Migrar tasks existentes sem organização
  update public.tasks 
  set organization_id = org_id 
  where user_id = current_user_id and organization_id is null;
  
end $$;

-- Dar permissão para usuários autenticados
grant execute on function public.ensure_user_has_organization() to authenticated;

-- =======================
-- 5. EXECUTAR CORREÇÃO PARA USUÁRIOS EXISTENTES
-- =======================

do $$
declare
  user_record record;
  org_id uuid;
begin
  -- Para cada usuário sem organização
  for user_record in 
    select distinct u.id, u.email
    from auth.users u
    left join public.organization_members om on om.user_id = u.id
    where om.user_id is null
  loop
    -- Criar organização padrão
    insert into public.organizations (name, slug, created_by)
    values (
      coalesce('Organização de ' || user_record.email, 'Organização Padrão'),
      'org-' || substr(user_record.id::text, 1, 8),
      user_record.id
    )
    returning id into org_id;
    
    -- Adicionar como admin
    insert into public.organization_members (organization_id, user_id, role)
    values (org_id, user_record.id, 'admin');
    
    -- Migrar tasks existentes
    update public.tasks 
    set organization_id = org_id 
    where user_id = user_record.id and organization_id is null;
    
    raise notice 'Organização criada para usuário: % (org: %)', user_record.email, org_id;
  end loop;
end $$;

-- =======================
-- 6. VERIFICAR SE A CORREÇÃO FUNCIONOU
-- =======================

-- Contar usuários sem organização (deve ser 0)
select count(*) as usuarios_sem_organizacao
from auth.users u
left join public.organization_members om on om.user_id = u.id
where om.user_id is null;

-- Contar tasks sem organização
select count(*) as tasks_sem_organizacao
from public.tasks
where organization_id is null;

-- Listar políticas aplicadas
select 
  policyname,
  cmd,
  qual,
  with_check
from pg_policies 
where tablename = 'tasks'
order by cmd, policyname;

-- Status final
select 'Correção de RLS aplicada com sucesso!' as status;