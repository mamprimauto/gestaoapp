-- Script de DEBUG para verificar status do admin
-- Execute este script no Supabase para ver o que está acontecendo

-- 1. Verificar TODOS os usuários e seus status
SELECT 
  id,
  email,
  name,
  role,
  approved,
  approved_at,
  CASE 
    WHEN role = 'admin' AND approved = true THEN '✅ ADMIN APROVADO - DEVE VER O MENU'
    WHEN role = 'admin' AND (approved = false OR approved IS NULL) THEN '❌ Admin mas NÃO aprovado'
    WHEN approved = true THEN '✅ Usuário aprovado'
    ELSE '❌ Usuário não aprovado'
  END as status_visual
FROM public.profiles
ORDER BY 
  CASE WHEN email IN ('igorzimpel@gmail.com', 'igorxiles@gmail.com', 'spectrumdigitalbr@gmail.com') THEN 0 ELSE 1 END,
  created_at DESC;

-- 2. Verificar especificamente os emails do Igor
SELECT 
  '=== VERIFICAÇÃO ESPECÍFICA ===' as info,
  id,
  email,
  role,
  approved,
  CASE 
    WHEN role = 'admin' AND approved = true THEN '✅ DEVE VER ADMINISTRATIVO'
    ELSE '❌ NÃO DEVE VER ADMINISTRATIVO'
  END as menu_visibility
FROM public.profiles
WHERE email IN (
  'igorzimpel@gmail.com',
  'igorxiles@gmail.com',
  'spectrumdigitalbr@gmail.com'
);

-- 3. Se você não aparece como admin aprovado, execute este UPDATE:
-- (Remova os -- do comando abaixo)
-- UPDATE public.profiles 
-- SET 
--   role = 'admin',
--   approved = true,
--   approved_at = COALESCE(approved_at, NOW())
-- WHERE email IN (
--   'igorzimpel@gmail.com',
--   'igorxiles@gmail.com',
--   'spectrumdigitalbr@gmail.com'
-- );

-- 4. Verificar novamente após o UPDATE
-- SELECT email, role, approved FROM public.profiles WHERE email IN ('igorzimpel@gmail.com', 'igorxiles@gmail.com', 'spectrumdigitalbr@gmail.com');