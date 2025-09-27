-- ===================================================
-- REMOVER TODOS OS TRIGGERS PROBLEMÁTICOS
-- Execute este script no Supabase SQL Editor
-- ===================================================

-- 1. Remover TODOS os triggers das tabelas vault
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

-- 2. Remover funções problemáticas
DROP FUNCTION IF EXISTS log_vault_access() CASCADE;
DROP FUNCTION IF EXISTS update_last_accessed() CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_strength() CASCADE;
DROP FUNCTION IF EXISTS detect_suspicious_activity() CASCADE;
DROP FUNCTION IF EXISTS calculate_password_strength(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS jsonb_build_array_text(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- 3. Criar função simples para updated_at
CREATE OR REPLACE FUNCTION simple_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar apenas o trigger essencial
CREATE TRIGGER vault_items_simple_updated
    BEFORE UPDATE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION simple_update_updated_at();

CREATE TRIGGER vault_settings_simple_updated
    BEFORE UPDATE ON vault_settings
    FOR EACH ROW
    EXECUTE FUNCTION simple_update_updated_at();

-- 5. Verificar resultado
SELECT 
    'Triggers removidos com sucesso!' as resultado,
    COUNT(*) as triggers_restantes
FROM information_schema.triggers
WHERE event_object_table LIKE 'vault_%';

-- ===================================================
-- PRONTO! Teste o vault agora
-- ===================================================