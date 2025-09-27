-- Padroniza papeis e garante que 'user' vire 'editor'
update public.profiles
set role = 'editor',
    updated_at = now()
where role = 'user';

-- Recria a função de trigger para normalizar o papel vindo do metadata
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
  v_role := lower(coalesce(new.raw_user_meta_data->>'role', 'editor'));

  -- normaliza: qualquer coisa fora da lista vira 'editor'
  if v_role not in ('admin','editor','copywriter','gestor_trafego','minerador') then
    v_role := 'editor';
  end if;

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
