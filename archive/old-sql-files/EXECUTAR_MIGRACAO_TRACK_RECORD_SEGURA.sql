-- ========================================
-- EXECUTAR NO SUPABASE SQL EDITOR - VERSÃO SEGURA
-- ========================================
-- Copie e cole este código inteiro no SQL Editor do Supabase
-- Esta versão verifica se objetos já existem antes de criar

-- Track Record System for Marketing Tests
-- Sistema completo para gerenciar testes A/B/C de marketing digital

-- Função para gerar próximo ID sequencial
CREATE OR REPLACE FUNCTION get_next_track_record_id(test_type TEXT, test_year INTEGER, org_id UUID)
RETURNS TEXT AS $$
DECLARE
    next_seq INTEGER;
    formatted_id TEXT;
BEGIN
    -- Busca o próximo número sequencial para o tipo e ano
    SELECT COALESCE(MAX(
        CASE 
            WHEN track_record_id ~ ('^' || test_type || '-' || test_year || '-[0-9]+$') 
            THEN CAST(SUBSTRING(track_record_id FROM '[0-9]+$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_seq
    FROM track_records 
    WHERE organization_id = org_id;
    
    -- Formatar como VSL-2025-001
    formatted_id := test_type || '-' || test_year || '-' || LPAD(next_seq::TEXT, 3, '0');
    
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

-- Tabela principal de Track Records (testes)
CREATE TABLE IF NOT EXISTS track_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  track_record_id TEXT NOT NULL, -- Ex: VSL-2025-001
  start_date DATE NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('VSL', 'Headline', 'CTA', 'Página', 'Criativo', 'Landing Page', 'Email', 'Anúncio', 'Thumbnail', 'Copy')),
  hypothesis TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('Facebook Ads', 'YouTube', 'Native', 'TikTok', 'Instagram', 'Google Ads', 'Email', 'Organic', 'Outro')),
  status TEXT NOT NULL CHECK (status IN ('Em andamento', 'Finalizado')) DEFAULT 'Em andamento',
  winner_variation_id UUID, -- Referência para variation vencedora
  insights TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar unique constraint apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'track_records_organization_id_track_record_id_key'
    ) THEN
        ALTER TABLE track_records ADD CONSTRAINT track_records_organization_id_track_record_id_key 
        UNIQUE(organization_id, track_record_id);
    END IF;
END $$;

-- Tabela de variações dos testes (A, B, C, etc.)
CREATE TABLE IF NOT EXISTS track_record_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_record_id UUID REFERENCES track_records(id) ON DELETE CASCADE,
  variation_name TEXT NOT NULL, -- A, B, C, D, etc.
  description TEXT,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar unique constraint apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'track_record_variations_track_record_id_variation_name_key'
    ) THEN
        ALTER TABLE track_record_variations ADD CONSTRAINT track_record_variations_track_record_id_variation_name_key 
        UNIQUE(track_record_id, variation_name);
    END IF;
END $$;

-- Tabela de KPIs/métricas das variações
CREATE TABLE IF NOT EXISTS track_record_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID REFERENCES track_record_variations(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL CHECK (kpi_name IN ('CTR', 'CPC', 'CPA', 'ROI', 'CVR', 'CPM', 'ROAS', 'LTV', 'Conversões', 'Impressões', 'Cliques', 'Vendas')),
  kpi_value DECIMAL(12,4), -- Valor numérico da métrica
  kpi_unit TEXT, -- Unidade: %, R$, unidades, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar unique constraint apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'track_record_kpis_variation_id_kpi_name_key'
    ) THEN
        ALTER TABLE track_record_kpis ADD CONSTRAINT track_record_kpis_variation_id_kpi_name_key 
        UNIQUE(variation_id, kpi_name);
    END IF;
END $$;

-- ========================================
-- Indexes para performance (só cria se não existir)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_track_records_organization ON track_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_track_records_type ON track_records(test_type);
CREATE INDEX IF NOT EXISTS idx_track_records_status ON track_records(status);
CREATE INDEX IF NOT EXISTS idx_track_records_date ON track_records(start_date);
CREATE INDEX IF NOT EXISTS idx_track_records_channel ON track_records(channel);
CREATE INDEX IF NOT EXISTS idx_track_record_variations_test ON track_record_variations(track_record_id);
CREATE INDEX IF NOT EXISTS idx_track_record_kpis_variation ON track_record_kpis(variation_id);
CREATE INDEX IF NOT EXISTS idx_track_record_kpis_name ON track_record_kpis(kpi_name);

-- ========================================
-- RLS Policies (só cria se não existir)
-- ========================================

-- Enable RLS
ALTER TABLE track_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_kpis ENABLE ROW LEVEL SECURITY;

-- Track Records Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'track_records' 
        AND policyname = 'Organization members can view track records'
    ) THEN
        CREATE POLICY "Organization members can view track records"
          ON track_records FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM organization_members om
              WHERE om.organization_id = track_records.organization_id
              AND om.user_id = auth.uid()
            )
          );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'track_records' 
        AND policyname = 'Organization members can create track records'
    ) THEN
        CREATE POLICY "Organization members can create track records"
          ON track_records FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM organization_members om
              WHERE om.organization_id = track_records.organization_id
              AND om.user_id = auth.uid()
            )
          );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'track_records' 
        AND policyname = 'Organization members can update track records'
    ) THEN
        CREATE POLICY "Organization members can update track records"
          ON track_records FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM organization_members om
              WHERE om.organization_id = track_records.organization_id
              AND om.user_id = auth.uid()
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM organization_members om
              WHERE om.organization_id = track_records.organization_id
              AND om.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Track Record Variations Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'track_record_variations' 
        AND policyname = 'Organization members can manage variations'
    ) THEN
        CREATE POLICY "Organization members can manage variations"
          ON track_record_variations FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM track_records tr
              JOIN organization_members om ON om.organization_id = tr.organization_id
              WHERE tr.id = track_record_variations.track_record_id
              AND om.user_id = auth.uid()
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM track_records tr
              JOIN organization_members om ON om.organization_id = tr.organization_id
              WHERE tr.id = track_record_variations.track_record_id
              AND om.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Track Record KPIs Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'track_record_kpis' 
        AND policyname = 'Organization members can manage KPIs'
    ) THEN
        CREATE POLICY "Organization members can manage KPIs"
          ON track_record_kpis FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM track_record_variations trv
              JOIN track_records tr ON tr.id = trv.track_record_id
              JOIN organization_members om ON om.organization_id = tr.organization_id
              WHERE trv.id = track_record_kpis.variation_id
              AND om.user_id = auth.uid()
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM track_record_variations trv
              JOIN track_records tr ON tr.id = trv.track_record_id
              JOIN organization_members om ON om.organization_id = tr.organization_id
              WHERE trv.id = track_record_kpis.variation_id
              AND om.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- ========================================
-- Triggers para updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_track_record_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS track_records_updated_at ON track_records;
CREATE TRIGGER track_records_updated_at
  BEFORE UPDATE ON track_records
  FOR EACH ROW EXECUTE FUNCTION update_track_record_updated_at();

DROP TRIGGER IF EXISTS track_record_variations_updated_at ON track_record_variations;
CREATE TRIGGER track_record_variations_updated_at
  BEFORE UPDATE ON track_record_variations
  FOR EACH ROW EXECUTE FUNCTION update_track_record_updated_at();

DROP TRIGGER IF EXISTS track_record_kpis_updated_at ON track_record_kpis;
CREATE TRIGGER track_record_kpis_updated_at
  BEFORE UPDATE ON track_record_kpis
  FOR EACH ROW EXECUTE FUNCTION update_track_record_updated_at();

-- ========================================
-- Trigger para atualizar winner automaticamente
-- ========================================
CREATE OR REPLACE FUNCTION update_track_record_winner()
RETURNS TRIGGER AS $$
BEGIN
  -- Se uma variação foi marcada como vencedora
  IF NEW.is_winner = true AND (OLD.is_winner IS NULL OR OLD.is_winner = false) THEN
    -- Remove winner de outras variações do mesmo teste
    UPDATE track_record_variations 
    SET is_winner = false 
    WHERE track_record_id = NEW.track_record_id 
    AND id != NEW.id;
    
    -- Atualiza o track record com o winner
    UPDATE track_records 
    SET winner_variation_id = NEW.id,
        status = 'Finalizado'
    WHERE id = NEW.track_record_id;
  END IF;
  
  -- Se removeu winner
  IF NEW.is_winner = false AND OLD.is_winner = true THEN
    UPDATE track_records 
    SET winner_variation_id = NULL
    WHERE id = NEW.track_record_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_record_winner_update ON track_record_variations;
CREATE TRIGGER track_record_winner_update
  AFTER UPDATE ON track_record_variations
  FOR EACH ROW EXECUTE FUNCTION update_track_record_winner();

-- ========================================
-- Views para consultas otimizadas
-- ========================================

-- View com todos os dados de um track record
CREATE OR REPLACE VIEW track_record_summary AS
SELECT 
  tr.id,
  tr.organization_id,
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

-- Comments nas tabelas
COMMENT ON TABLE track_records IS 'Testes de marketing digital (A/B/C) com track record completo';
COMMENT ON TABLE track_record_variations IS 'Variações de cada teste (A, B, C, etc.)';
COMMENT ON TABLE track_record_kpis IS 'Métricas de performance de cada variação';

COMMENT ON COLUMN track_records.track_record_id IS 'ID único do teste no formato TIPO-ANO-SEQUENCIAL (ex: VSL-2025-001)';
COMMENT ON COLUMN track_records.hypothesis IS 'Hipótese do teste - o que você acredita que vai funcionar melhor';
COMMENT ON COLUMN track_records.winner_variation_id IS 'ID da variação vencedora do teste';
COMMENT ON COLUMN track_record_variations.is_winner IS 'Indica se esta variação foi a vencedora do teste';
COMMENT ON COLUMN track_record_kpis.kpi_value IS 'Valor numérico da métrica (ex: 2.5 para CTR de 2.5%)';

-- ========================================
-- SUCESSO! 
-- ========================================
-- ✅ Migração executada com segurança - objetos existentes foram preservados
-- ✅ Tabelas criadas: track_records, track_record_variations, track_record_kpis
-- ✅ Políticas RLS habilitadas (sem duplicação)
-- ✅ Triggers e funções criadas/atualizadas
-- ✅ Índices de performance adicionados
-- ✅ Views otimizadas criadas
-- 
-- Agora você pode usar o sistema Track Record em /trackrecord
-- ========================================

-- TESTE RÁPIDO: Verificar se as tabelas foram criadas
SELECT 
    'track_records' as tabela,
    COUNT(*) as total_registros,
    'Tabela principal de testes A/B/C' as descricao
FROM track_records
UNION ALL
SELECT 
    'track_record_variations' as tabela,
    COUNT(*) as total_registros,
    'Variações de cada teste (A, B, C, etc.)' as descricao
FROM track_record_variations
UNION ALL
SELECT 
    'track_record_kpis' as tabela,
    COUNT(*) as total_registros,
    'Métricas de performance das variações' as descricao
FROM track_record_kpis;