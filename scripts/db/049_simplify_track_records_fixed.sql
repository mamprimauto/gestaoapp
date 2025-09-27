-- ========================================
-- SIMPLIFICAR SISTEMA DE TRACK RECORDS (VERSÃO CORRIGIDA)
-- Remove organizações e complexidade desnecessária
-- ========================================

-- PASSO 1: Desabilitar RLS em todas as tabelas
ALTER TABLE IF EXISTS track_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_record_kpis DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas RLS existentes
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Remove policies from track_records
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'track_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON track_records', pol.policyname);
    END LOOP;
    
    -- Remove policies from track_record_variations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'track_record_variations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON track_record_variations', pol.policyname);
    END LOOP;
    
    -- Remove policies from track_record_kpis
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'track_record_kpis'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON track_record_kpis', pol.policyname);
    END LOOP;
END $$;

-- PASSO 3: Remover a coluna organization_id (se existir)
-- Primeiro, remover a constraint de unique que inclui organization_id
ALTER TABLE IF EXISTS track_records DROP CONSTRAINT IF EXISTS track_records_organization_id_track_record_id_key;

-- Remover foreign key constraint se existir
ALTER TABLE IF EXISTS track_records DROP CONSTRAINT IF EXISTS track_records_organization_id_fkey;

-- Remover a coluna organization_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='track_records' AND column_name='organization_id') THEN
        ALTER TABLE track_records DROP COLUMN organization_id;
    END IF;
END $$;

-- PASSO 4: Criar nova constraint unique apenas no track_record_id
ALTER TABLE track_records DROP CONSTRAINT IF EXISTS track_records_track_record_id_unique;
ALTER TABLE track_records ADD CONSTRAINT track_records_track_record_id_unique UNIQUE(track_record_id);

-- PASSO 5: Atualizar função para gerar IDs sem organization_id
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

-- PASSO 6: Atualizar view track_record_summary sem organization_id
DROP VIEW IF EXISTS track_record_summary;

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

-- PASSO 7: Criar políticas SUPER SIMPLES (apenas usuário autenticado) com nomes únicos
-- Track Records - qualquer usuário autenticado pode fazer tudo
CREATE POLICY "authenticated_users_track_records"
ON track_records FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Variations - qualquer usuário autenticado pode fazer tudo
CREATE POLICY "authenticated_users_variations"
ON track_record_variations FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- KPIs - qualquer usuário autenticado pode fazer tudo
CREATE POLICY "authenticated_users_kpis"
ON track_record_kpis FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- PASSO 8: Reabilitar RLS com políticas simples
ALTER TABLE track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis ENABLE ROW LEVEL SECURITY;

-- PASSO 9: Garantir permissões básicas
GRANT ALL ON track_records TO authenticated;
GRANT ALL ON track_record_variations TO authenticated;
GRANT ALL ON track_record_kpis TO authenticated;

-- Garantir permissões em sequências (se existirem)
DO $$
BEGIN
    -- Check if sequence exists before granting
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

-- PASSO 10: Atualizar comentários
COMMENT ON TABLE track_records IS 'Testes A/B colaborativos - sistema simplificado para equipes pequenas';
COMMENT ON COLUMN track_records.track_record_id IS 'ID único global do teste (ex: VSL-2025-001)';

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Verificar estrutura da tabela
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
WHERE tablename IN ('track_records', 'track_record_variations', 'track_record_kpis')
ORDER BY tablename, policyname;

-- Testar função (sem erro de sintaxe)
SELECT get_next_track_record_id('VSL', 2025) as next_test_id;