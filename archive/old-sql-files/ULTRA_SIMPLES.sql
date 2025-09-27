-- ========================================
-- SISTEMA ULTRA SIMPLES - ZERO COMPLICAÇÕES
-- Apenas UMA tabela para testar
-- ========================================

-- 1. Limpar tudo que já existe (opcional)
DROP TABLE IF EXISTS simple_ab_tests CASCADE;
DROP TABLE IF EXISTS simple_ab_variants CASCADE;
DROP TABLE IF EXISTS simple_ab_metrics CASCADE;

-- 2. Criar UMA tabela só, super simples
CREATE TABLE ab_tests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  hypothesis TEXT,
  test_type TEXT DEFAULT 'VSL',
  status TEXT DEFAULT 'running',
  created_at TIMESTAMP DEFAULT now()
);

-- 3. SEM RLS - acesso total
ALTER TABLE ab_tests DISABLE ROW LEVEL SECURITY;

-- 4. Permissões totais
GRANT ALL ON ab_tests TO authenticated;
GRANT ALL ON SEQUENCE ab_tests_id_seq TO authenticated;

-- ========================================
-- TESTE IMEDIATO
-- ========================================

-- Inserir um registro de teste
INSERT INTO ab_tests (name, hypothesis) 
VALUES ('Teste Manual', 'Hipótese de teste')
RETURNING *;

-- Verificar se funcionou
SELECT * FROM ab_tests;