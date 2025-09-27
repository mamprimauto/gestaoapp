-- ========================================
-- VERIFICAR E CORRIGIR CRIAÇÃO DE TESTES
-- ========================================

-- 1. Verificar se há testes criados
SELECT 
    id,
    track_record_id,
    organization_id,
    hypothesis,
    status,
    created_at
FROM track_records
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar se o usuário Igor tem acesso
SELECT 
    tr.*
FROM track_records tr
WHERE tr.organization_id = 'a214d299-3e9f-4b18-842b-c74dc52b5dfc'
ORDER BY tr.created_at DESC
LIMIT 5;

-- 3. Tentar criar um teste manualmente
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
    'TEST-2025-MANUAL',
    'Teste manual criado via SQL',
    'Headline',
    'Facebook Ads',
    CURRENT_DATE,
    'Em andamento',
    'f3f3ebbe-b466-4afd-afef-0339ab05bc22'
)
RETURNING *;

-- 4. Verificar se foi criado
SELECT * FROM track_records WHERE track_record_id = 'TEST-2025-MANUAL';

-- 5. Limpar testes duplicados ou com problema
-- DELETE FROM track_records WHERE track_record_id LIKE 'TEST-%';

-- 6. Verificar constraints da tabela
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'track_records'::regclass;

-- 7. Garantir que não há triggers problemáticos
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'track_records'::regclass;

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute cada seção separadamente
-- 2. Veja se o teste manual é criado
-- 3. Se funcionar, o problema é no código
-- 4. Se não funcionar, há problema no banco
-- ========================================