-- ========================================
-- SISTEMA NOVO: TESTES A/B SUPER SIMPLES
-- Zero complicações, zero organizações
-- ========================================

-- 1. Criar tabela nova super simples
CREATE TABLE simple_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT UNIQUE NOT NULL,
  hypothesis TEXT NOT NULL,
  test_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de variações (simples)
CREATE TABLE simple_ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES simple_ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- A, B, C
  description TEXT,
  is_control BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de métricas (simples)
CREATE TABLE simple_ab_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES simple_ab_variants(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(12,4),
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SEM RLS - acesso livre para todos
ALTER TABLE simple_ab_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE simple_ab_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE simple_ab_metrics DISABLE ROW LEVEL SECURITY;

-- 5. Permissões totais
GRANT ALL ON simple_ab_tests TO authenticated;
GRANT ALL ON simple_ab_variants TO authenticated;
GRANT ALL ON simple_ab_metrics TO authenticated;

-- 6. Função para gerar próximo ID
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
-- TESTE RÁPIDO
-- ========================================

-- Testar função
SELECT get_simple_test_id('VSL') as next_vsl_id;
SELECT get_simple_test_id('HEA') as next_headline_id;

-- Verificar tabelas
SELECT COUNT(*) as tests FROM simple_ab_tests;
SELECT COUNT(*) as variants FROM simple_ab_variants;
SELECT COUNT(*) as metrics FROM simple_ab_metrics;