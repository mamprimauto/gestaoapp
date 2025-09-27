-- Sistema de aprovação manual de usuários - VERSÃO CORRIGIDA
-- Remove a necessidade de confirmação por email e adiciona aprovação por administrador

-- 1. Adicionar campos necessários na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Adicionar campo role se não existir (com valores permitidos)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN role TEXT DEFAULT 'user' 
    CHECK (role IN ('admin', 'user', 'pending', 'editor', 'copywriter', 'gestor_trafego', 'minerador'));
  END IF;
END $$;

-- 2. Atualizar usuários existentes como aprovados (assumindo que já estão trabalhando)
UPDATE public.profiles 
SET approved = true, 
    approved_at = NOW()
WHERE approved IS NULL;

-- 3. IMPORTANTE: Defina você como admin (SUBSTITUA COM SEU EMAIL)
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

-- 6. Limpar policies antigas
DROP POLICY IF EXISTS "Admins can update user approval" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- 7. Criar novas policies simples e funcionais

-- Todos podem ver todos os perfis
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Usuários podem atualizar apenas seu próprio perfil básico
CREATE POLICY "Users update own basic profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins podem fazer qualquer coisa
CREATE POLICY "Admins full access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON public.profiles(approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 9. Verificação final
SELECT 'Setup concluído! Agora execute o UPDATE para definir seu usuário como admin.' as mensagem;