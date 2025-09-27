-- ========================================================
-- CONFIRMAR EMAILS - VERSÃO CORRIGIDA
-- ========================================================
-- Remove erro "Email not confirmed"
-- ========================================================

-- 1. Ver usuários com email não confirmado
SELECT 
    id,
    email,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '❌ NÃO confirmado - precisa corrigir'
    END as status
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- 2. CONFIRMAR EMAIL DE TODOS OS USUÁRIOS (sem tocar em confirmed_at)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 3. Confirmar emails específicos se necessário
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email IN (
    'igorzimpel@gmail.com',
    'igorxiles@gmail.com', 
    'spectrumdigitalbr@gmail.com'
) AND email_confirmed_at IS NULL;

-- 4. Verificar resultado
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as emails_confirmados,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as emails_pendentes
FROM auth.users;

-- 5. Listar quem ainda está pendente (se houver)
SELECT 
    email,
    created_at,
    '❌ Ainda pendente' as status
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- ========================================================
-- IMPORTANTE: Após executar este SQL com sucesso:
-- 
-- 1. Vá no Supabase Dashboard
-- 2. Authentication > Settings > Email Auth
-- 3. DESMARQUE "Enable email confirmations"
-- 4. Salve as configurações
-- 
-- Isso permitirá login sem confirmação de email
-- ========================================================