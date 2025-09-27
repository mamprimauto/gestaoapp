-- 🚀 CORREÇÃO RÁPIDA: Tornar Primeiro Usuário Admin
-- Execute no Supabase SQL Editor

-- Ver todos os usuários e seus roles
SELECT id, email, name, role FROM profiles ORDER BY created_at;

-- OPÇÃO 1: Tornar o primeiro usuário (mais antigo) em admin
UPDATE profiles 
SET role = 'admin'
WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);

-- OPÇÃO 2: Tornar um email específico em admin
-- Descomente e edite a linha abaixo com seu email:
-- UPDATE profiles SET role = 'admin' WHERE email = 'seu_email@exemplo.com';

-- OPÇÃO 3: Tornar TODOS os usuários em admin (temporariamente para teste)
-- UPDATE profiles SET role = 'admin';

-- Verificar resultado
SELECT 
    email,
    name,
    role,
    CASE role
        WHEN 'admin' THEN '✅ Admin'
        WHEN 'gestor_trafego' THEN '👔 Gestor'
        WHEN 'editor' THEN '📝 Editor'
        WHEN 'copywriter' THEN '✏️ Copywriter'
        WHEN 'minerador' THEN '⛏️ Minerador'
        ELSE '❌ Sem role'
    END as status
FROM profiles 
ORDER BY created_at;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Role atualizado!';
    RAISE NOTICE '🔄 Recarregue a página /vault';
    RAISE NOTICE '📋 O debug deve mostrar: role: admin';
END $$;