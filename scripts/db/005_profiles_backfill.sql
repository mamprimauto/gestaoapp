-- Backfill de perfis para usuários existentes e promoção do admin especificado

-- 1) Insere perfis que ainda não existem, a partir de auth.users
insert into public.profiles (id, email, name, role, created_at, updated_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', null) as name,
  case
    when lower(coalesce(u.raw_user_meta_data->>'role','')) in ('admin','editor','copywriter','gestor_trafego','minerador')
      then lower(u.raw_user_meta_data->>'role')
    when lower(coalesce(u.raw_user_meta_data->>'role','')) = 'user'
      then 'editor'
    else 'editor'
  end as role,
  now(),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 2) Garante que o seu usuário seja admin
update public.profiles
set role = 'admin',
    updated_at = now()
where email = 'igorzimpel@gmail.com';

-- Observação: a RLS já permite SELECT para qualquer usuário autenticado.
-- Caso necessário rodar novamente, estas instruções são idempotentes.
