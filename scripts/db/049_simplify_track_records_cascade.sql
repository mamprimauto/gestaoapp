-- ========================================
-- SIMPLIFICAR SISTEMA DE TRACK RECORDS (COM CASCADE)
-- Remove organizações e todas as dependências
-- ========================================

-- PASSO 1: Desabilitar RLS em todas as tabelas
ALTER TABLE IF EXISTS track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_kpis DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_learnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_comparisons DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas RLS existentes de TODAS as tabelas relacionadas
DO $$ 
DECLARE
    pol RECORD;
    tbl TEXT;
BEGIN
    -- Lista de todas as tabelas relacionadas a track_record
    FOR tbl IN SELECT unnest(ARRAY['track_records', 'track_record_variations', 'track_record_kpis', 
                                   'track_record_results', 'track_record_learnings', 
                                   'track_record_attachments', 'track_record_comparisons'])
    LOOP
        -- Remove policies from each table
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- PASSO 3: Remover views que dependem da coluna organization_id
DROP VIEW IF EXISTS track_record_summary CASCADE;
DROP VIEW IF EXISTS track_record_full_report CASCADE;

-- PASSO 4: Remover constraints relacionadas a organization_id
ALTER TABLE IF EXISTS track_records DROP CONSTRAINT IF EXISTS track_records_organization_id_track_record_id_key;
ALTER TABLE IF EXISTS track_records DROP CONSTRAINT IF EXISTS track_records_organization_id_fkey;

-- PASSO 5: Agora remover a coluna organization_id com CASCADE (remove todas as dependências)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='track_records' AND column_name='organization_id') THEN
        ALTER TABLE track_records DROP COLUMN organization_id CASCADE;
    END IF;
END $$;

-- PASSO 6: Criar nova constraint unique apenas no track_record_id
ALTER TABLE track_records DROP CONSTRAINT IF EXISTS track_records_track_record_id_unique;
ALTER TABLE track_records ADD CONSTRAINT track_records_track_record_id_unique UNIQUE(track_record_id);

-- PASSO 7: Atualizar função para gerar IDs sem organization_id
CREATE OR REPLACE FUNCTION get_next_track_record_id(test_type TEXT, test_year INTEGER)
RETURNS TEXT AS $$
DECLARE
    next_seq INTEGER;
    formatted_id TEXT;
BEGIN
    -- Busca o próximo número sequencial para o tipo e ano (sem filtro de organização)
    SELECT COALESCE(MAX(
        CASE 
            WHEN track_record_id ~ ('^' || test_type || '-' || test_year || '-[0-9]+$') 
            THEN CAST(SUBSTRING(track_record_id FROM '[0-9]+$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_seq
    FROM track_records;
    
    -- Formatar como VSL-2025-001
    formatted_id := test_type || '-' || test_year || '-' || LPAD(next_seq::TEXT, 3, '0');
    
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

-- PASSO 8: Recriar view track_record_summary SEM organization_id
CREATE OR REPLACE VIEW track_record_summary AS
SELECT 
  tr.id,
  tr.track_record_id,
  tr.start_date,
  tr.test_type,
  tr.hypothesis,
  tr.channel,
  tr.status,
  tr.insights,
  tr.created_at,
  tr.updated_at,
  -- Dados da variação vencedora
  wv.variation_name as winner_name,
  wv.description as winner_description,
  -- Contadores
  (SELECT COUNT(*) FROM track_record_variations WHERE track_record_id = tr.id) as variation_count,
  -- Criador
  p.name as created_by_name,
  p.avatar_url as created_by_avatar
FROM track_records tr
LEFT JOIN track_record_variations wv ON wv.id = tr.winner_variation_id
LEFT JOIN profiles p ON p.id = tr.created_by;

-- PASSO 9: Criar políticas SUPER SIMPLES para TODAS as tabelas (apenas usuário autenticado)
-- Track Records
CREATE POLICY "authenticated_users_track_records"
ON track_records FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Variations
CREATE POLICY "authenticated_users_variations"
ON track_record_variations FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- KPIs
CREATE POLICY "authenticated_users_kpis"
ON track_record_kpis FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Results (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_results') THEN
        EXECUTE 'CREATE POLICY "authenticated_users_results" ON track_record_results FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    END IF;
END $$;

-- Learnings (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_learnings') THEN
        EXECUTE 'CREATE POLICY "authenticated_users_learnings" ON track_record_learnings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    END IF;
END $$;

-- Attachments (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_attachments') THEN
        EXECUTE 'CREATE POLICY "authenticated_users_attachments" ON track_record_attachments FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    END IF;
END $$;

-- Comparisons (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_comparisons') THEN
        EXECUTE 'CREATE POLICY "authenticated_users_comparisons" ON track_record_comparisons FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    END IF;
END $$;

-- PASSO 10: Reabilitar RLS com políticas simples
ALTER TABLE track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis ENABLE ROW LEVEL SECURITY;

-- Reabilitar RLS nas outras tabelas se existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_results') THEN
        EXECUTE 'ALTER TABLE track_record_results ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_learnings') THEN
        EXECUTE 'ALTER TABLE track_record_learnings ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_attachments') THEN
        EXECUTE 'ALTER TABLE track_record_attachments ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_comparisons') THEN
        EXECUTE 'ALTER TABLE track_record_comparisons ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- PASSO 11: Garantir permissões básicas
GRANT ALL ON track_records TO authenticated;
GRANT ALL ON track_record_variations TO authenticated;
GRANT ALL ON track_record_kpis TO authenticated;

-- Grants nas outras tabelas se existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_results') THEN
        EXECUTE 'GRANT ALL ON track_record_results TO authenticated';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_learnings') THEN
        EXECUTE 'GRANT ALL ON track_record_learnings TO authenticated';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_attachments') THEN
        EXECUTE 'GRANT ALL ON track_record_attachments TO authenticated';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_record_comparisons') THEN
        EXECUTE 'GRANT ALL ON track_record_comparisons TO authenticated';
    END IF;
END $$;

-- Garantir permissões em sequências (se existirem)
DO $$
BEGIN
    -- Check if sequences exist before granting
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'track_records_id_seq') THEN
        GRANT USAGE ON SEQUENCE track_records_id_seq TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'track_record_variations_id_seq') THEN
        GRANT USAGE ON SEQUENCE track_record_variations_id_seq TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'track_record_kpis_id_seq') THEN
        GRANT USAGE ON SEQUENCE track_record_kpis_id_seq TO authenticated;
    END IF;
END $$;

-- PASSO 12: Atualizar comentários
COMMENT ON TABLE track_records IS 'Testes A/B colaborativos - sistema simplificado para equipes pequenas';
COMMENT ON COLUMN track_records.track_record_id IS 'ID único global do teste (ex: VSL-2025-001)';

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Verificar estrutura da tabela (não deve ter organization_id)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'track_records' 
ORDER BY ordinal_position;

-- Verificar policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename LIKE 'track_record%'
ORDER BY tablename, policyname;

-- Testar função
SELECT get_next_track_record_id('VSL', 2025) as next_test_id;

-- Verificar se views foram recriadas
SELECT viewname FROM pg_views WHERE viewname LIKE 'track_record%';