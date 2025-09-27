-- 🔧 CORREÇÃO DE PERFIS PARA VAULT
-- Execute este script no Supabase SQL Editor

-- 1. Verificar usuários existentes
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- 2. Verificar perfis existentes
SELECT id, email, name, role FROM profiles;

-- 3. Fazer backfill de perfis para TODOS os usuários no auth.users
INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
  CASE
    -- Mapeamento específico por email
    WHEN u.email = 'igorzimpel@gmail.com' THEN 'admin'
    WHEN u.email = 'spectrumdigitalbr@gmail.com' THEN 'editor'
    WHEN u.email = 'igorxiles@gmail.com' THEN 'editor'
    WHEN u.email = 'demo@trafficpro.local' THEN 'editor'
    -- Verificar metadata primeiro
    WHEN lower(COALESCE(u.raw_user_meta_data->>'role','')) IN ('admin','editor','copywriter','gestor_trafego','minerador')
      THEN lower(u.raw_user_meta_data->>'role')
    -- Default para editor
    ELSE 'editor'
  END as role,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. Atualizar perfis existentes com roles corretos
UPDATE public.profiles SET role = 'admin' WHERE email = 'igorzimpel@gmail.com';
UPDATE public.profiles SET role = 'editor' WHERE email = 'spectrumdigitalbr@gmail.com';
UPDATE public.profiles SET role = 'editor' WHERE email = 'igorxiles@gmail.com';

-- 5. Garantir que o trigger existe para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_name text;
  v_role text;
BEGIN
  v_name := COALESCE(new.raw_user_meta_data->>'name', new.email);
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'editor');
  
  -- Validar role
  IF v_role NOT IN ('admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador') THEN
    v_role := 'editor';
  END IF;
  
  INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
  VALUES (new.id, new.email, v_name, v_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        name = COALESCE(excluded.name, public.profiles.name),
        role = COALESCE(excluded.role, public.profiles.role),
        updated_at = NOW();
  RETURN new;
END;
$$;

-- 6. Recriar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Verificar resultado final
SELECT 
    p.email,
    p.name,
    p.role,
    CASE 
        WHEN p.role = 'admin' THEN '✅ ADMIN'
        WHEN p.role = 'editor' THEN '📝 EDITOR'
        WHEN p.role = 'copywriter' THEN '✏️ COPYWRITER'
        WHEN p.role = 'gestor_trafego' THEN '📊 GESTOR'
        WHEN p.role = 'minerador' THEN '⛏️ MINERADOR'
        ELSE '❓ ' || p.role
    END as status,
    p.created_at,
    p.updated_at
FROM profiles p
ORDER BY p.created_at;

-- 8. Garantir RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas já existentes devem funcionar:
-- profiles_select_all: authenticated users podem ver todos
-- profiles_update_self: user pode atualizar próprio perfil
-- profiles_update_admin: admin pode atualizar qualquer perfil