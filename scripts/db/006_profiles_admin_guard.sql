-- Restringe a alteração de função (role) a administradores

-- 1) Trigger que bloqueia mudança de role por não-admin
create or replace function public.block_role_change_if_not_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Permite updates que não alteram a role
  if (new.role is distinct from old.role) then
    -- Apenas admin pode alterar role
    if not exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    ) then
      raise exception 'Apenas administradores podem alterar a função (role) de usuários.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_block_role_change on public.profiles;
create trigger trg_profiles_block_role_change
before update on public.profiles
for each row execute function public.block_role_change_if_not_admin();

-- 2) (Opcional) Reforça política: mantém self-update mas o trigger já impede trocar role
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (auth.uid() = id);

-- Admin já tem política para atualizar qualquer perfil (mantém):
-- "profiles_update_admin" criada nos scripts anteriores.
