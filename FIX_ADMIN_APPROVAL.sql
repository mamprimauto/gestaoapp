-- CORREÇÃO URGENTE: Tornar você admin E aprovado
-- Execute este SQL no Supabase para corrigir seu acesso

-- 1. Primeiro, vamos ver todos os usuários e seus status
SELECT id, email, name, role, approved, approved_at 
FROM public.profiles
ORDER BY created_at DESC;

-- 2. Tornar TODOS os usuários existentes aprovados e o primeiro como admin
-- (já que são usuários que já estavam no sistema)
UPDATE public.profiles 
SET 
  approved = true,
  approved_at = COALESCE(approved_at, NOW()),
  role = CASE 
    WHEN role = 'admin' THEN 'admin'
    WHEN role IN ('editor', 'copywriter', 'gestor_trafego', 'minerador') THEN role
    ELSE 'user'
  END
WHERE approved IS NULL OR approved = false;

-- 3. IMPORTANTE: Definir você como admin aprovado
-- SUBSTITUA com seu email real
UPDATE public.profiles 
SET 
  role = 'admin',
  approved = true,
  approved_at = NOW()
WHERE email IN (
  'igorzimpel@gmail.com',  -- Igor Zimpel
  'igorxiles@gmail.com',    -- Igor Xiles
  'spectrumdigitalbr@gmail.com' -- Spectrum Digital
);

-- 4. Verificar se funcionou
SELECT 
  email,
  name,
  role,
  approved,
  CASE 
    WHEN role = 'admin' AND approved = true THEN '✅ ADMIN APROVADO'
    WHEN approved = true THEN '✅ Usuário Aprovado'
    ELSE '❌ Não Aprovado'
  END as status
FROM public.profiles
ORDER BY 
  CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
  created_at DESC;