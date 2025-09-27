-- ========================================
-- VERIFICAR STATUS ATUAL DAS TABELAS
-- ========================================

-- 1. Verificar se RLS está realmente desabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('track_records', 'track_record_variations', 'track_record_kpis')
ORDER BY tablename;

-- 2. Verificar estrutura da tabela track_records
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'track_records' 
ORDER BY ordinal_position;

-- 3. Verificar constraints e indexes
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'track_records'::regclass;

-- 4. Testar INSERT direto (simular o que o app faz)
-- DESCOMENTE APENAS PARA TESTAR:
/*
INSERT INTO track_records (
    organization_id,
    track_record_id,
    hypothesis,
    test_type,
    channel,
    start_date,
    status,
    created_by
) VALUES (
    'a214d299-3e9f-4b18-842b-c74dc52b5dfc',
    'TEST-2025-999',
    'Teste manual via SQL',
    'Headline',
    'Facebook Ads',
    CURRENT_DATE,
    'Em andamento',
    'f3f3ebbe-b466-4afd-afef-0339ab05bc22'
) RETURNING id, track_record_id, created_at;
*/

-- 5. Verificar dados existentes
SELECT 
    id,
    organization_id,
    track_record_id,
    test_type,
    created_at
FROM track_records
ORDER BY created_at DESC
LIMIT 5;