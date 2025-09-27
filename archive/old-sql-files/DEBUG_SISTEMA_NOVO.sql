-- ========================================
-- DEBUG: Verificar se sistema novo funcionou
-- ========================================

-- 1. Verificar se tabelas foram criadas
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name IN ('simple_ab_tests', 'simple_ab_variants', 'simple_ab_metrics');

-- 2. Verificar estrutura da tabela principal
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'simple_ab_tests' 
ORDER BY ordinal_position;

-- 3. Verificar se função existe
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_simple_test_id';

-- 4. Testar função manualmente
SELECT get_simple_test_id('VSL') as test_vsl;
SELECT get_simple_test_id('HEA') as test_headline;

-- 5. Testar INSERT manual
INSERT INTO simple_ab_tests (
    test_id,
    hypothesis,
    test_type,
    channel,
    created_by
) VALUES (
    'DEBUG-2025-001',
    'Teste manual de debug',
    'VSL',
    'YouTube',
    'f3f3ebbe-b466-4afd-afef-0339ab05bc22'
) RETURNING id, test_id, created_at;

-- 6. Verificar dados na tabela
SELECT * FROM simple_ab_tests ORDER BY created_at DESC LIMIT 3;