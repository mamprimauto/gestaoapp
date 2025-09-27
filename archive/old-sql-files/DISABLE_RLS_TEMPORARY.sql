-- ========================================
-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para testes
-- ATENÇÃO: Use apenas para desenvolvimento/teste!
-- ========================================

-- Desabilitar completamente RLS nas tabelas de track_record
ALTER TABLE track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('track_records', 'track_record_variations', 'track_record_kpis');

-- ========================================
-- Para reabilitar RLS no futuro, use:
-- ========================================
/*
ALTER TABLE track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis ENABLE ROW LEVEL SECURITY;
*/

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Teste criar um teste A/B
-- 3. Se funcionar, o problema é definitivamente com as políticas RLS
-- ========================================