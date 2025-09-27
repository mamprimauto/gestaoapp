-- Adiciona coluna de avatar na tabela de perfis, idempotente
alter table public.profiles
  add column if not exists avatar_url text;

-- Mantém políticas já existentes:
-- - profiles_select_all (authenticated pode ver todos)
-- - profiles_update_self (o próprio usuário pode atualizar seu perfil)
-- - profiles_update_admin (admins podem atualizar qualquer perfil)
