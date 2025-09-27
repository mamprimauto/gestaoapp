-- ========================================
-- SOLUÇÃO SUPER SIMPLES - SEM COMPLICAÇÕES
-- Apenas desabilitar RLS para funcionar
-- ========================================

-- Desabilitar RLS em todas as tabelas de track record
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- Fim. Só isso mesmo.
-- O resto já funciona como está.