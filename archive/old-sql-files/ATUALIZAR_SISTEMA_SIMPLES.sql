-- ========================================
-- ATUALIZAR SISTEMA PARA VERSÃO MELHORADA
-- Adicionar datas e comentários
-- ========================================

-- 1. Adicionar novas colunas à tabela existente
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT '';

-- 2. Atualizar testes existentes com data de início
UPDATE ab_tests 
SET start_date = CURRENT_DATE 
WHERE start_date IS NULL;

-- 3. Verificar estrutura atualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'ab_tests' 
ORDER BY ordinal_position;

-- 4. Verificar dados existentes
SELECT * FROM ab_tests;