-- ========================================================
-- VERIFICAR E CORRIGIR STATUS DOS USUÁRIOS
-- ========================================================

-- 1. Ver TODOS os usuários e seus status
SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.approved,
    CASE 
        WHEN p.approved = true THEN '✅ APROVADO - Pode fazer login'
        WHEN p.approved = false THEN '❌ NÃO aprovado - Bloqueado'
        WHEN p.approved IS NULL THEN '⚠️ NULL - Será bloqueado'
        ELSE '❓ Status desconhecido'
    END as status_login,
    u.email_confirmed_at,
    CASE 
        WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
        ELSE '❌ Email NÃO confirmado'
    END as status_email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;

-- 2. APROVAR VOCÊ (Igor) - Execute este comando!
UPDATE public.profiles 
SET 
    approved = true,
    role = 'admin'
WHERE email IN (
    'igorzimpel@gmail.com',
    'igorxiles@gmail.com',
    'spectrumdigitalbr@gmail.com'
);

-- 3. Ver usuários NÃO aprovados
SELECT 
    email,
    name,
    role,
    created_at,
    '❌ Precisa aprovar' as acao_necessaria
FROM public.profiles
WHERE approved = false OR approved IS NULL
ORDER BY created_at DESC;

-- 4. OPCIONAL: Aprovar TODOS os usuários existentes
-- (Remova os -- se quiser executar)
-- UPDATE public.profiles 
-- SET approved = true
-- WHERE approved = false OR approved IS NULL;

-- 5. Verificar resultado final
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN approved = true THEN 1 END) as aprovados,
    COUNT(CASE WHEN approved = false OR approved IS NULL THEN 1 END) as nao_aprovados
FROM public.profiles;