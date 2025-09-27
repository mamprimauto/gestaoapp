-- ========================================================
-- DESABILITAR CONFIRMAÇÃO DE EMAIL NO SUPABASE
-- ========================================================
-- Este script remove a necessidade de confirmação de email
-- ========================================================

-- 1. Verificar status atual dos usuários
SELECT 
    '📧 STATUS DE CONFIRMAÇÃO DE EMAIL' as info
UNION ALL
SELECT 
    '================================' as info;

SELECT 
    id,
    email,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
        ELSE '❌ Email NÃO confirmado'
    END as status_email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- 2. CONFIRMAR EMAIL DE TODOS OS USUÁRIOS EXISTENTES
UPDATE auth.users 
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 3. Verificar se funcionou
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as emails_confirmados,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as emails_nao_confirmados
FROM auth.users;

-- 4. Para usuários específicos (se necessário)
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email IN (
    'igorzimpel@gmail.com',
    'igorxiles@gmail.com', 
    'spectrumdigitalbr@gmail.com'
) AND email_confirmed_at IS NULL;

-- 5. IMPORTANTE: Configuração do Supabase Auth
-- Você precisa também ir no painel do Supabase:
-- 1. Authentication > Settings
-- 2. Em "Email Auth", DESABILITE:
--    - "Enable email confirmations" (Desmarque esta opção)
--    - Ou defina "Allow unconfirmed email logins" como TRUE
-- 3. Salve as configurações

-- 6. Resultado final
SELECT 
    '🎉 RESULTADO' as info,
    CASE 
        WHEN COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) = 0
        THEN 'Todos os emails foram confirmados!'
        ELSE 'Ainda há ' || COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END)::text || ' emails não confirmados'
    END as status
FROM auth.users;

-- ========================================================
-- ATENÇÃO: Após executar este SQL, vá em:
-- Supabase Dashboard > Authentication > Settings
-- Desabilite "Enable email confirmations"
-- ========================================================