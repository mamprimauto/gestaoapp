-- ========================================
-- CORRIGIR CONSTRAINT E DUPLICADOS FINAL
-- ========================================

-- 1. Desabilitar RLS
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- 2. Remover a constraint antiga (organization_id + track_record_id)
ALTER TABLE track_records DROP CONSTRAINT IF EXISTS track_records_organization_id_track_record_id_key;

-- 3. Primeiro, vamos limpar duplicados por track_record_id (manter o mais recente)
DELETE FROM track_records
WHERE id NOT IN (
    SELECT DISTINCT ON (track_record_id) id
    FROM track_records
    ORDER BY track_record_id, created_at DESC NULLS LAST, id DESC
);

-- 4. Corrigir organization_id NULL
UPDATE track_records 
SET organization_id = 'a214d299-3e9f-4b18-842b-c74dc52b5dfc'
WHERE organization_id IS NULL;

-- 5. Criar constraint única APENAS no track_record_id (global)
ALTER TABLE track_records ADD CONSTRAINT track_records_track_record_id_unique UNIQUE(track_record_id);

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Verificar se ainda há duplicados
SELECT 
    track_record_id, 
    COUNT(*) as count 
FROM track_records 
GROUP BY track_record_id 
HAVING COUNT(*) > 1;

-- Mostrar registros finais
SELECT 
    id,
    organization_id,
    track_record_id,
    test_type,
    created_at
FROM track_records
ORDER BY created_at DESC
LIMIT 10;