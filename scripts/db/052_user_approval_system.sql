-- Sistema de aprovação manual de usuários
-- Remove a necessidade de confirmação por email e adiciona aprovação por administrador

-- 1. Adicionar campo de aprovação na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'pending'));

-- 2. Atualizar usuários existentes como aprovados (assumindo que já estão trabalhando)
UPDATE public.profiles 
SET approved = true, 
    approved_at = NOW(),
    role = 'user'
WHERE approved IS NULL;

-- 3. Definir o primeiro usuário (você) como admin
-- SUBSTITUA COM SEU USER ID REAL
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE email = 'seu-email@exemplo.com';

-- 4. Criar função para verificar se usuário está aprovado
CREATE OR REPLACE FUNCTION public.is_user_approved(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar policies para gerenciar usuários
-- Remover policy antiga se existir
DROP POLICY IF EXISTS "Admins can update user approval" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Policy para visualização - todos podem ver todos os perfis
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Policy para atualização do próprio perfil (exceto campos admin)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Não pode alterar campos de aprovação e role
  (approved IS NOT DISTINCT FROM approved) AND
  (role IS NOT DISTINCT FROM role)
);

-- Policy para admins atualizarem qualquer perfil
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 7. Criar view para admins verem usuários pendentes
CREATE OR REPLACE VIEW public.pending_users AS
SELECT 
  id,
  email,
  name,
  created_at,
  approved,
  role
FROM public.profiles
WHERE approved = false OR role = 'pending'
WITH LOCAL CHECK OPTION;

-- 8. Grant acesso à view apenas para admins (via RLS)
ALTER VIEW public.pending_users SET (security_invoker = on);

-- 9. Criar RLS para a view
CREATE POLICY "Only admins can view pending users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Se estiver consultando pending_users, precisa ser admin
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) OR auth.uid() = id
);

-- 10. Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON public.profiles(approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);