-- Corrigir RLS para permitir que admins atualizem avatares de outros usuários
-- Remove políticas existentes e recria com permissões corretas

-- Primeiro, remover políticas existentes de update se houver
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Criar política que permite:
-- 1. Usuários atualizarem seu próprio perfil
-- 2. Admins atualizarem qualquer perfil
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE
USING (
  -- Usuário pode atualizar próprio perfil OU é admin
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  -- Mesma condição para WITH CHECK
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Garantir que a política de SELECT está funcionando
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT
USING (true); -- Todos podem ver todos os perfis (sistema interno)

-- Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Garantir que a coluna avatar_url existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Dar permissões adequadas
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;