-- ===================================================
-- CORRIGIR ERRO DO TRIGGER DO VAULT
-- Execute este script no Supabase SQL Editor
-- ===================================================

-- 1. Remover triggers problemáticos
DROP TRIGGER IF EXISTS vault_items_audit_trigger ON vault_items;
DROP TRIGGER IF EXISTS update_vault_item_last_accessed ON vault_items;
DROP TRIGGER IF EXISTS calculate_vault_item_strength ON vault_items;
DROP TRIGGER IF EXISTS detect_vault_anomalies ON vault_access_logs;

-- 2. Remover funções problemáticas
DROP FUNCTION IF EXISTS log_vault_access() CASCADE;
DROP FUNCTION IF EXISTS update_last_accessed() CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_strength() CASCADE;
DROP FUNCTION IF EXISTS detect_suspicious_activity() CASCADE;
DROP FUNCTION IF EXISTS calculate_password_strength(TEXT, TEXT) CASCADE;

-- 3. Criar trigger simples para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Aplicar trigger de updated_at
CREATE TRIGGER update_vault_items_updated_at
    BEFORE UPDATE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_settings_updated_at
    BEFORE UPDATE ON vault_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Verificar que as tabelas estão funcionando
SELECT 'vault_items' as tabela, COUNT(*) as registros FROM vault_items
UNION ALL
SELECT 'vault_settings', COUNT(*) FROM vault_settings
UNION ALL
SELECT 'vault_access_logs', COUNT(*) FROM vault_access_logs
UNION ALL
SELECT 'vault_sessions', COUNT(*) FROM vault_sessions;

-- ===================================================
-- PRONTO! O vault deve funcionar agora sem erros
-- ===================================================