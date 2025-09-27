-- ========================================
-- CORRIGIR CONSTRAINT DE FORMA SEGURA
-- ========================================

-- 1. Desabilitar RLS
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as constraints relacionadas (se existirem)
ALTER TABLE track_records DROP CONSTRAINT IF EXISTS track_records_organization_id_track_record_id_key;
ALTER TABLE track_records DROP CONSTRAINT IF EXISTS track_records_track_record_id_unique;
ALTER TABLE track_records DROP CONSTRAINT IF EXISTS track_records_track_record_id_key;

-- 3. Primeiro, vamos limpar duplicados por track_record_id (manter o mais recente)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Contar duplicados
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT track_record_id, COUNT(*) as cnt
        FROM track_records
        GROUP BY track_record_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Encontrados % grupos de track_record_id duplicados', duplicate_count;
    
    -- Se há duplicados, limpar mantendo apenas o mais recente
    IF duplicate_count > 0 THEN
        DELETE FROM track_records
        WHERE id NOT IN (
            SELECT DISTINCT ON (track_record_id) id
            FROM track_records
            ORDER BY track_record_id, created_at DESC NULLS LAST, id DESC
        );
        
        RAISE NOTICE 'Duplicados removidos. Mantidos apenas os registros mais recentes.';
    END IF;
END $$;

-- 4. Corrigir organization_id NULL
UPDATE track_records 
SET organization_id = 'a214d299-3e9f-4b18-842b-c74dc52b5dfc'
WHERE organization_id IS NULL;

-- 5. Criar constraint única APENAS no track_record_id (com nome único)
ALTER TABLE track_records ADD CONSTRAINT track_records_track_id_uniq UNIQUE(track_record_id);

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Verificar constraints atuais
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'track_records'::regclass
ORDER BY conname;

-- Verificar se ainda há duplicados
SELECT 
    track_record_id, 
    COUNT(*) as count 
FROM track_records 
GROUP BY track_record_id 
HAVING COUNT(*) > 1;

-- Mostrar registros finais
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT track_record_id) as unique_track_ids,
    COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as null_org_ids
FROM track_records;