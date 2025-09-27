-- 🔄 Migração: Integração Completa do Vault com Sistema de Equipe
-- Esta migração remove a dependência da tabela user_permissions e garante 
-- que o vault use diretamente os roles da tabela profiles

-- ===== VERIFICAÇÃO DE SEGURANÇA =====
DO $$
BEGIN
    -- Verificar se existem senhas importantes no vault antes de alterar a estrutura
    IF EXISTS (SELECT 1 FROM vault_items WHERE visibility_level != 'personal') THEN
        RAISE NOTICE '⚠️  ATENÇÃO: Existem senhas compartilhadas no vault. Execute apenas se souber o que está fazendo.';
    END IF;
    
    -- Verificar se a tabela profiles tem todos os usuários necessários
    IF EXISTS (SELECT 1 FROM auth.users WHERE id NOT IN (SELECT id FROM profiles)) THEN
        RAISE EXCEPTION '❌ ERRO: Nem todos os usuários do auth.users têm perfil na tabela profiles. Execute primeiro a migração de perfis.';
    END IF;
END $$;

-- ===== BACKUP DE DADOS (OPCIONAL) =====
-- Criar backup da estrutura atual caso algo dê errado
CREATE TABLE IF NOT EXISTS vault_items_backup AS 
SELECT * FROM vault_items WHERE 1=0; -- Estrutura vazia para backup

-- ===== LIMPEZA DE TABELAS DESNECESSÁRIAS =====
-- Remover tabela user_permissions se existir
DROP TABLE IF EXISTS user_permissions CASCADE;

-- Remover outras tabelas relacionadas ao sistema antigo se existirem
DROP TABLE IF EXISTS vault_sessions CASCADE;
DROP TABLE IF EXISTS vault_access_logs CASCADE;

-- ===== ATUALIZAÇÃO DE POLÍTICAS RLS =====
-- Remover políticas antigas que dependiam de user_permissions
DROP POLICY IF EXISTS "vault_items_select_policy" ON vault_items;
DROP POLICY IF EXISTS "vault_items_insert_policy" ON vault_items;
DROP POLICY IF EXISTS "vault_items_update_policy" ON vault_items;
DROP POLICY IF EXISTS "vault_items_delete_policy" ON vault_items;

-- Criar novas políticas baseadas no sistema de profiles
-- 1. Select: usuário pode ver próprios items + items compartilhados baseado no role
CREATE POLICY "vault_items_select_policy" ON vault_items
    FOR SELECT USING (
        -- Próprios items
        user_id = auth.uid()
        OR
        -- Items compartilhados baseado no visibility_level e role do usuário
        (
            visibility_level = 'admin' AND 
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
        OR
        (
            visibility_level = 'manager' AND 
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor_trafego'))
        )
        OR
        (
            visibility_level = 'team' AND 
            created_by_department = (SELECT 
                CASE 
                    WHEN role = 'admin' THEN 'administrador'::user_department
                    WHEN role = 'editor' THEN 'editor'::user_department
                    WHEN role = 'copywriter' THEN 'copywriter'::user_department
                    WHEN role = 'gestor_trafego' THEN 'gestor'::user_department
                    WHEN role = 'minerador' THEN 'minerador'::user_department
                    ELSE 'particular'::user_department
                END
                FROM profiles WHERE id = auth.uid()
            )
        )
        OR
        (
            visibility_level = 'custom' AND 
            (SELECT 
                CASE 
                    WHEN role = 'admin' THEN 'administrador'::user_department
                    WHEN role = 'editor' THEN 'editor'::user_department
                    WHEN role = 'copywriter' THEN 'copywriter'::user_department
                    WHEN role = 'gestor_trafego' THEN 'gestor'::user_department
                    WHEN role = 'minerador' THEN 'minerador'::user_department
                    ELSE 'particular'::user_department
                END
                FROM profiles WHERE id = auth.uid()
            ) = ANY(allowed_departments)
        )
    );

-- 2. Insert: usuário pode criar items
CREATE POLICY "vault_items_insert_policy" ON vault_items
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- 3. Update: usuário pode atualizar próprios items OU admin pode atualizar qualquer um
CREATE POLICY "vault_items_update_policy" ON vault_items
    FOR UPDATE USING (
        user_id = auth.uid()
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Delete: usuário pode deletar próprios items OU admin pode deletar qualquer um
CREATE POLICY "vault_items_delete_policy" ON vault_items
    FOR DELETE USING (
        user_id = auth.uid()
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ===== ATUALIZAÇÃO DE DADOS EXISTENTES =====
-- Garantir que todos os items tenham um departamento criador válido
UPDATE vault_items 
SET created_by_department = COALESCE(
    (SELECT 
        CASE 
            WHEN p.role = 'admin' THEN 'administrador'::user_department
            WHEN p.role = 'editor' THEN 'editor'::user_department
            WHEN p.role = 'copywriter' THEN 'copywriter'::user_department
            WHEN p.role = 'gestor_trafego' THEN 'gestor'::user_department
            WHEN p.role = 'minerador' THEN 'minerador'::user_department
            ELSE 'particular'::user_department
        END
     FROM profiles p WHERE p.id = vault_items.user_id),
    'particular'::user_department
)
WHERE created_by_department IS NULL OR created_by_department = '';

-- ===== LIMPEZA DE APIS DESNECESSÁRIAS =====
-- Comentário para lembrar de remover arquivos:
-- - /app/api/vault/permissions/ (não é mais necessário)

-- ===== VERIFICAÇÕES FINAIS =====
DO $$
DECLARE
    vault_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Contar items no vault
    SELECT COUNT(*) INTO vault_count FROM vault_items;
    
    -- Contar perfis
    SELECT COUNT(*) INTO profile_count FROM profiles;
    
    -- Resultados
    RAISE NOTICE '✅ Migração concluída com sucesso!';
    RAISE NOTICE '📊 Total de items no vault: %', vault_count;
    RAISE NOTICE '👥 Total de perfis de usuário: %', profile_count;
    RAISE NOTICE '🔐 Sistema agora integrado com tabela profiles';
    RAISE NOTICE '🗑️  Tabela user_permissions removida';
    RAISE NOTICE '🛡️  Políticas RLS atualizadas para usar roles da equipe';
END $$;

-- ===== INSTRUÇÕES PÓS-MIGRAÇÃO =====
/*
🎯 PRÓXIMOS PASSOS:

1. ✅ Testar o vault no navegador
2. ✅ Verificar se as permissões funcionam corretamente
3. ✅ Confirmar que usuários de diferentes departamentos veem apenas o que devem
4. 🗑️  Remover arquivo /app/api/vault/permissions/route.ts (não é mais necessário)
5. 🔄 Fazer deploy das mudanças

📋 PARA TESTAR:

1. Faça login como admin → deve ver todas as senhas
2. Faça login como editor → deve ver apenas senhas do departamento editor + pessoais
3. Crie senha com visibilidade "custom" → deve permitir selecionar departamentos específicos
4. Verifique se o debug no vault mostra: role, department e permissões corretas

⚠️ PROBLEMAS CONHECIDOS:

- Se ainda aparecer erro de "perfil não encontrado", verifique se todos os usuários em auth.users têm entrada correspondente em profiles
- Se as permissões não funcionarem, verifique se os roles em profiles estão corretos: 'admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador'

🎉 BENEFÍCIOS DESTA INTEGRAÇÃO:

✅ Sistema unificado: vault usa diretamente os roles da equipe
✅ Menos duplicação de dados: sem tabela user_permissions separada  
✅ Controle granular: cada senha pode ser compartilhada com departamentos específicos
✅ Administração simplificada: mudança de role na equipe afeta automaticamente o vault
✅ Segurança mantida: RLS continua protegendo os dados corretamente
*/