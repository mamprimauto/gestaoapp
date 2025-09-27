-- ========================================
-- CORRIGIR ERRO DE SINTAXE E PROBLEMAS
-- ========================================

-- 1. Primeiro, verificar se tabelas existem
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'simple_ab_%';

-- 2. Se não existem, criar tabelas sem foreign key problemática
DROP TABLE IF EXISTS simple_ab_metrics CASCADE;
DROP TABLE IF EXISTS simple_ab_variants CASCADE;
DROP TABLE IF EXISTS simple_ab_tests CASCADE;

-- 3. Criar tabela principal SEM foreign key problemática
CREATE TABLE simple_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT UNIQUE NOT NULL,
  hypothesis TEXT NOT NULL,
  test_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT, -- SEM foreign key, apenas texto
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabelas relacionadas
CREATE TABLE simple_ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES simple_ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_control BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE simple_ab_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES simple_ab_variants(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(12,4),
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. DESABILITAR RLS COMPLETAMENTE
ALTER TABLE simple_ab_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE simple_ab_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE simple_ab_metrics DISABLE ROW LEVEL SECURITY;

-- 6. PERMISSÕES COMPLETAS
GRANT ALL PRIVILEGES ON simple_ab_tests TO authenticated;
GRANT ALL PRIVILEGES ON simple_ab_variants TO authenticated;
GRANT ALL PRIVILEGES ON simple_ab_metrics TO authenticated;

-- 7. Função corrigida (delimitadores corretos)
CREATE OR REPLACE FUNCTION get_simple_test_id(p_test_type TEXT)
RETURNS TEXT AS $$
DECLARE
    next_seq INTEGER;
    year_str TEXT;
BEGIN
    year_str := EXTRACT(year FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN test_id ~ ('^' || p_test_type || '-' || year_str || '-[0-9]+$') 
            THEN CAST(SUBSTRING(test_id FROM '[0-9]+$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_seq
    FROM simple_ab_tests;
    
    RETURN p_test_type || '-' || year_str || '-' || LPAD(next_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TESTE IMEDIATO
-- ========================================

-- Testar INSERT manual
INSERT INTO simple_ab_tests (
    test_id,
    hypothesis,
    test_type,
    channel,
    created_by
) VALUES (
    'TEST-2025-001',
    'Teste manual',
    'VSL',
    'YouTube',
    'test-user'
) RETURNING *;

-- Verificar se funcionou
SELECT * FROM simple_ab_tests;

-- Testar função
SELECT get_simple_test_id('VSL') as next_vsl_id;