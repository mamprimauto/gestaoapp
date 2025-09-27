-- ========================================
-- CORRIGIR ORGANIZATION_ID NULL
-- ========================================

-- 1. Primeiro, desabilitar RLS completamente
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- 2. Corrigir registros com organization_id NULL
UPDATE track_records 
SET organization_id = 'a214d299-3e9f-4b18-842b-c74dc52b5dfc'
WHERE organization_id IS NULL;

-- 3. Verificar se corrigiu
SELECT COUNT(*) as registros_null FROM track_records WHERE organization_id IS NULL;
SELECT COUNT(*) as registros_total FROM track_records;

-- 4. Mostrar alguns registros para confirmar
SELECT 
    id,
    organization_id,
    track_record_id,
    test_type,
    created_at
FROM track_records
ORDER BY created_at DESC
LIMIT 5;