-- ============================================
-- SCRIPT PARA TORNAR USUÁRIO ADMIN
-- Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Listar todos os usuários para você escolher qual tornar admin
SELECT 
  id,
  email,
  name,
  full_name,
  role,
  approved,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 2. IMPORTANTE: Copie o ID do seu usuário da lista acima
-- e substitua 'SEU_USER_ID_AQUI' pelo ID copiado no comando abaixo:

-- ============================================
-- OPÇÃO A: Se você sabe seu email
-- ============================================
UPDATE profiles 
SET 
  role = 'admin',
  approved = true
WHERE email = 'SEU_EMAIL_AQUI@gmail.com';

-- ============================================
-- OPÇÃO B: Se você sabe seu ID
-- ============================================
-- UPDATE profiles 
-- SET 
--   role = 'admin',
--   approved = true
-- WHERE id = 'SEU_USER_ID_AQUI';

-- ============================================
-- OPÇÃO C: Tornar o usuário mais recente em admin
-- (útil se você acabou de criar a conta)
-- ============================================
UPDATE profiles 
SET 
  role = 'admin',
  approved = true
WHERE id = (
  SELECT id 
  FROM profiles 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 3. Verificar se funcionou
SELECT 
  id,
  email,
  name,
  role,
  approved
FROM profiles
WHERE role = 'admin';

-- ============================================
-- RESULTADO ESPERADO:
-- Você deve ver seu usuário com:
-- role = 'admin'
-- approved = true
-- ============================================

-- Se você vir a mensagem "UPDATE 1", funcionou!
-- Agora recarregue a página /equipe e a aba Cursos aparecerá.