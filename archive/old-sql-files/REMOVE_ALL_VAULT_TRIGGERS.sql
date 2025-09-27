-- ===================================================
-- REMOVER TODOS OS TRIGGERS DAS TABELAS DO VAULT
-- Execute este script no Supabase SQL Editor
-- ===================================================

-- 1. Listar todos os triggers nas tabelas vault
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table LIKE 'vault_%'
ORDER BY event_object_table, trigger_name;

-- 2. Remover TODOS os triggers das tabelas vault
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table LIKE 'vault_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 
                      trigger_record.trigger_name, 
                      trigger_record.event_object_table);
        RAISE NOTICE 'Removed trigger: % on table %', 
                     trigger_record.trigger_name, 
                     trigger_record.event_object_table;
    END LOOP;
END $$;

-- 3. Criar apenas trigger básico para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Aplicar trigger updated_at apenas onde necessário
DROP TRIGGER IF EXISTS update_vault_items_updated ON vault_items;
CREATE TRIGGER update_vault_items_updated
    BEFORE UPDATE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_vault_settings_updated ON vault_settings;
CREATE TRIGGER update_vault_settings_updated
    BEFORE UPDATE ON vault_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 5. Verificar que não há mais triggers problemáticos
SELECT 
    'Triggers restantes:' as info,
    COUNT(*) as total
FROM information_schema.triggers
WHERE event_object_table LIKE 'vault_%';

-- 6. Testar inserção simples
-- Este teste deve funcionar sem erros
INSERT INTO vault_items (
    user_id,
    title,
    encrypted_password,
    salt,
    iv,
    category
) VALUES (
    auth.uid(),
    'TEST_ITEM_DELETE_ME',
    'test_encrypted',
    'test_salt',
    'test_iv',
    'login'
);

-- Deletar item de teste
DELETE FROM vault_items WHERE title = 'TEST_ITEM_DELETE_ME';

-- Se chegou até aqui, está funcionando!
SELECT 'SUCESSO! Triggers removidos e vault funcionando!' as resultado;

-- ===================================================
-- EXECUTE ESTE SCRIPT COMPLETO!
-- Depois teste o vault novamente
-- ===================================================