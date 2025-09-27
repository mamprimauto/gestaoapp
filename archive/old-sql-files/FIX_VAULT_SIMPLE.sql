-- ===================================================
-- REMOVER APENAS OS TRIGGERS PROBLEMÁTICOS
-- Execute este script no Supabase SQL Editor
-- ===================================================

-- 1. Remover apenas os triggers que causam erro
DROP TRIGGER IF EXISTS vault_items_audit_trigger ON vault_items;
DROP TRIGGER IF EXISTS detect_vault_anomalies ON vault_access_logs;

-- 2. Remover apenas as funções problemáticas
DROP FUNCTION IF EXISTS log_vault_access() CASCADE;
DROP FUNCTION IF EXISTS detect_suspicious_activity() CASCADE;

-- 3. Verificar que as tabelas estão funcionando
SELECT 'vault_items' as tabela, COUNT(*) as registros FROM vault_items
UNION ALL
SELECT 'vault_settings', COUNT(*) FROM vault_settings
UNION ALL
SELECT 'vault_access_logs', COUNT(*) FROM vault_access_logs
UNION ALL
SELECT 'vault_sessions', COUNT(*) FROM vault_sessions;

-- ===================================================
-- PRONTO! Execute este script e teste o vault novamente
-- ===================================================