-- 🎯 MIGRAÇÃO FINAL: Apenas o Essencial
-- Para sistema que já teve migrações parciais

-- ===== VERIFICAÇÃO DO ESTADO ATUAL =====
DO $$
DECLARE
    vault_count INTEGER;
    profile_count INTEGER;
    user_perm_exists BOOLEAN;
    has_policies INTEGER;
BEGIN
    -- Verificar estado atual
    SELECT COUNT(*) INTO vault_count FROM vault_items;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_permissions') INTO user_perm_exists;
    SELECT COUNT(*) INTO has_policies FROM pg_policies WHERE tablename = 'vault_items';
    
    RAISE NOTICE '📊 ESTADO ATUAL:';
    RAISE NOTICE 'Senhas no vault: %', vault_count;
    RAISE NOTICE 'Perfis de usuário: %', profile_count;
    RAISE NOTICE 'Tabela user_permissions existe: %', user_perm_exists;
    RAISE NOTICE 'Políticas RLS ativas: %', has_policies;
    RAISE NOTICE '';
END $$;

-- ===== LIMPEZA TOTAL (SEM ERROS) =====
DO $$
BEGIN
    RAISE NOTICE '🧹 Fazendo limpeza completa...';
END $$;

-- Desabilitar RLS temporariamente
ALTER TABLE vault_items DISABLE ROW LEVEL SECURITY;

-- Limpar TODAS as políticas existentes (sem erros)
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'vault_items'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vault_items', policy_name);
        RAISE NOTICE 'Removida política: %', policy_name;
    END LOOP;
END $$;

-- Limpar funções e triggers
DROP TRIGGER IF EXISTS set_vault_item_department_trigger ON vault_items;
DROP TRIGGER IF EXISTS vault_set_department_trigger ON vault_items;
DROP FUNCTION IF EXISTS can_user_access_vault_item(UUID, UUID);
DROP FUNCTION IF EXISTS set_vault_item_department();
DROP FUNCTION IF EXISTS set_department_from_profile();

-- Remover user_permissions se ainda existir
DROP TABLE IF EXISTS user_permissions CASCADE;

-- ===== CONFIGURAR DADOS BÁSICOS =====
DO $$
BEGIN
    RAISE NOTICE '🔧 Configurando dados básicos...';
END $$;

-- Garantir que todos os items tenham departamento válido
UPDATE vault_items 
SET created_by_department = 'particular'::user_department
WHERE created_by_department IS NULL;

-- ===== CRIAR SISTEMA INTEGRADO =====
DO $$
BEGIN
    RAISE NOTICE '🛡️ Criando sistema integrado vault + profiles...';
END $$;

-- Política SELECT: próprios items + compartilhados baseado no role
CREATE POLICY "vault_profiles_access" ON vault_items
    FOR SELECT USING (
        -- Sempre pode ver próprios items
        user_id = auth.uid()
        OR
        -- Admin vê tudo
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
        OR
        -- Visibilidade admin: apenas admins
        (visibility_level = 'admin' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
        OR
        -- Visibilidade manager: admins e gestores
        (visibility_level = 'manager' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor_trafego')))
        OR
        -- Visibilidade custom: baseada em allowed_departments
        (visibility_level = 'custom' AND EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (
                CASE p.role
                    WHEN 'admin' THEN 'administrador'
                    WHEN 'editor' THEN 'editor'
                    WHEN 'copywriter' THEN 'copywriter'
                    WHEN 'gestor_trafego' THEN 'gestor'
                    WHEN 'minerador' THEN 'minerador'
                    ELSE 'particular'
                END
            )::user_department = ANY(allowed_departments)
        ))
    );

-- Política INSERT: qualquer usuário autenticado pode criar
CREATE POLICY "vault_profiles_insert" ON vault_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política UPDATE: próprios items ou admin
CREATE POLICY "vault_profiles_update" ON vault_items
    FOR UPDATE USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Política DELETE: próprios items ou admin
CREATE POLICY "vault_profiles_delete" ON vault_items
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ===== TRIGGER PARA NOVOS ITEMS =====
CREATE OR REPLACE FUNCTION set_vault_department()
RETURNS TRIGGER AS $$
BEGIN
    -- Definir departamento baseado no role do usuário
    SELECT 
        CASE role
            WHEN 'admin' THEN 'administrador'
            WHEN 'editor' THEN 'editor'
            WHEN 'copywriter' THEN 'copywriter'
            WHEN 'gestor_trafego' THEN 'gestor'
            WHEN 'minerador' THEN 'minerador'
            ELSE 'particular'
        END::user_department
    INTO NEW.created_by_department
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Fallback se não encontrar
    IF NEW.created_by_department IS NULL THEN
        NEW.created_by_department := 'particular'::user_department;
    END IF;
    
    -- Visibilidade padrão
    IF NEW.visibility_level IS NULL THEN
        NEW.visibility_level := 'personal'::vault_visibility_level;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vault_set_department
    BEFORE INSERT ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION set_vault_department();

-- ===== REATIVAR RLS =====
DO $$
BEGIN
    RAISE NOTICE '🔒 Reativando RLS...';
END $$;

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

-- ===== VERIFICAÇÃO FINAL =====
DO $$
DECLARE
    vault_count INTEGER;
    profile_count INTEGER;
    policy_count INTEGER;
    null_dept INTEGER;
BEGIN
    SELECT COUNT(*) INTO vault_count FROM vault_items;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'vault_items';
    SELECT COUNT(*) INTO null_dept FROM vault_items WHERE created_by_department IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===== MIGRAÇÃO FINAL CONCLUÍDA! =====';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Estatísticas:';
    RAISE NOTICE '   Senhas no vault: %', vault_count;
    RAISE NOTICE '   Perfis de usuário: %', profile_count;
    RAISE NOTICE '   Políticas RLS ativas: %', policy_count;
    RAISE NOTICE '   Items sem departamento: %', null_dept;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Sistema vault + profiles integrado!';
    RAISE NOTICE '✅ Tabela user_permissions removida!';
    RAISE NOTICE '✅ Permissões granulares por departamento!';
    RAISE NOTICE '✅ Pronto para uso!';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Teste agora: /vault';
    
    IF null_dept > 0 THEN
        RAISE WARNING '⚠️ Ainda há % items sem departamento!', null_dept;
    END IF;
END $$;

/*
🎉 SISTEMA INTEGRADO FUNCIONANDO!

📋 Como funciona agora:
• Admin: vê TODAS as senhas
• Editor: vê senhas pessoais + senhas marcadas para "editor" 
• Copywriter: vê senhas pessoais + senhas marcadas para "copywriter"
• Gestor de Tráfego: vê senhas pessoais + senhas de "gestor" + pode gerenciar equipe
• Minerador: vê senhas pessoais + senhas marcadas para "minerador"

🔧 Integração completa:
• Mudança de role em /equipe → afeta automaticamente o vault
• Cada nível de departamento vê determinada senha (conforme solicitado)
• Sistema unificado sem duplicação

🗑️ Limpeza pós-migração:
• Delete: /app/api/vault/permissions/route.ts (não precisa mais)
*/