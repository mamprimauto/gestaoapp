-- 🔧 CORREÇÃO: Definir Role de Admin no Banco
-- Execute este script no Supabase SQL Editor

-- ===== ETAPA 1: VERIFICAR ESTADO ATUAL =====
DO $$
BEGIN
    RAISE NOTICE '🔍 Verificando usuários e seus roles...';
END $$;

-- Mostrar todos os usuários e seus roles atuais
SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    CASE 
        WHEN p.role IS NULL THEN '❌ NULL - PROBLEMA!'
        WHEN p.role = '' THEN '❌ VAZIO - PROBLEMA!'
        WHEN p.role = 'admin' THEN '✅ Admin OK'
        ELSE '⚠️ ' || p.role
    END as status
FROM profiles p
ORDER BY p.created_at;

-- ===== ETAPA 2: IDENTIFICAR SEU USUÁRIO =====
-- Encontre SEU email na lista acima e anote o ID

-- ===== ETAPA 3: CORRIGIR ROLE DO ADMIN =====
-- IMPORTANTE: Substitua 'SEU_EMAIL_AQUI' pelo seu email real

UPDATE profiles 
SET role = 'admin'
WHERE email = 'SEU_EMAIL_AQUI';

-- ===== ETAPA 4: VERIFICAR CORREÇÃO =====
SELECT 
    id,
    email,
    name,
    role,
    CASE 
        WHEN role = 'admin' THEN '✅ ADMIN CONFIGURADO!'
        ELSE '❌ Ainda com problema'
    END as status
FROM profiles 
WHERE email = 'SEU_EMAIL_AQUI';

-- ===== ETAPA 5: VERIFICAR TODOS OS USUÁRIOS =====
DO $$
DECLARE
    admin_count INTEGER;
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    SELECT COUNT(*) INTO null_count FROM profiles WHERE role IS NULL OR role = '';
    SELECT COUNT(*) INTO total_count FROM profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMO:';
    RAISE NOTICE 'Total de usuários: %', total_count;
    RAISE NOTICE 'Admins configurados: %', admin_count;
    RAISE NOTICE 'Usuários sem role: %', null_count;
    
    IF null_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ ATENÇÃO: Ainda há % usuários sem role definido!', null_count;
        RAISE NOTICE 'Execute o comando abaixo para definir todos sem role como editor:';
        RAISE NOTICE 'UPDATE profiles SET role = ''editor'' WHERE role IS NULL OR role = '''';';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Role do admin configurado! Recarregue a página /vault';
END $$;

/*
🎯 INSTRUÇÕES RÁPIDAS:

1. Execute TODO este script no Supabase
2. Procure SEU email na primeira tabela
3. Edite a linha 24 substituindo 'SEU_EMAIL_AQUI' pelo seu email
4. Execute novamente o script
5. Recarregue a página /vault no navegador
6. O debug deve mostrar: role: admin, can_create_shared: ✅ true

📋 ROLES DISPONÍVEIS:
- 'admin' → Acesso total, vê todas as senhas
- 'gestor_trafego' → Manager, pode criar compartilhadas
- 'editor' → User, acesso básico
- 'copywriter' → User, acesso básico
- 'minerador' → User, acesso básico

🔧 PARA DEFINIR MÚLTIPLOS ADMINS:
UPDATE profiles SET role = 'admin' WHERE email IN ('email1@exemplo.com', 'email2@exemplo.com');
*/