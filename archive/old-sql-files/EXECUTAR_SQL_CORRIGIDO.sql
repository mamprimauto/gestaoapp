-- ========================================
-- Track Record Finalization System (VERSÃO CORRIGIDA)
-- ========================================
-- Sistema completo para finalização e documentação de resultados de testes A/B/C

-- Tabela de resultados finais do teste
CREATE TABLE IF NOT EXISTS track_record_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_record_id UUID UNIQUE REFERENCES track_records(id) ON DELETE CASCADE,
  
  -- Informações do vencedor
  winner_reason TEXT NOT NULL,
  winner_reason_category TEXT CHECK (winner_reason_category IN ('roi', 'conversion', 'cpa', 'engagement', 'other')),
  
  -- Dados estatísticos
  test_duration_days INTEGER NOT NULL,
  total_sample_size INTEGER,
  confidence_level DECIMAL(5,2) DEFAULT 95.00,
  statistical_significance BOOLEAN DEFAULT false,
  uplift_percentage DECIMAL(10,2), -- Melhoria percentual do vencedor
  estimated_annual_impact DECIMAL(15,2), -- Impacto financeiro estimado
  
  -- Insights e aprendizados
  what_worked TEXT,
  what_didnt_work TEXT,
  next_steps TEXT,
  key_takeaway TEXT, -- Principal aprendizado em uma frase
  
  -- Qualidade e meta-dados
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  finalized_by UUID REFERENCES profiles(id),
  finalized_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tags de aprendizado
CREATE TABLE IF NOT EXISTS track_record_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_record_id UUID REFERENCES track_records(id) ON DELETE CASCADE,
  learning_tag TEXT NOT NULL,
  category TEXT CHECK (category IN ('copy', 'design', 'cta', 'audience', 'timing', 'offer', 'technical', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(track_record_id, learning_tag)
);

-- Tabela de anexos/evidências
CREATE TABLE IF NOT EXISTS track_record_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_record_id UUID REFERENCES track_records(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER, -- em bytes
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de comparações entre variações (para análise detalhada)
CREATE TABLE IF NOT EXISTS track_record_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_record_id UUID REFERENCES track_records(id) ON DELETE CASCADE,
  variation_a_id UUID REFERENCES track_record_variations(id) ON DELETE CASCADE,
  variation_b_id UUID REFERENCES track_record_variations(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  delta_value DECIMAL(12,4), -- Diferença absoluta
  delta_percentage DECIMAL(10,2), -- Diferença percentual
  favors_variation TEXT, -- 'A' ou 'B'
  is_significant BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(track_record_id, variation_a_id, variation_b_id, kpi_name)
);

-- Tags de aprendizado pré-definidas
CREATE TABLE IF NOT EXISTS learning_tags_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('copy', 'design', 'cta', 'audience', 'timing', 'offer', 'technical', 'other')),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Popular tags iniciais
INSERT INTO learning_tags_library (tag_name, category) VALUES
  ('Copy emocional funciona melhor', 'copy'),
  ('Headlines com números convertem mais', 'copy'),
  ('Urgência aumenta conversão', 'cta'),
  ('CTA no topo performa melhor', 'cta'),
  ('Prova social é essencial', 'copy'),
  ('Vídeos longos retém mais', 'design'),
  ('Imagens de pessoas convertem mais', 'design'),
  ('Mobile-first é crucial', 'technical'),
  ('Público jovem prefere vídeos curtos', 'audience'),
  ('Fim de semana tem melhor engajamento', 'timing'),
  ('Desconto percentual > valor absoluto', 'offer'),
  ('Garantia reduz objeções', 'offer'),
  ('Simplicidade vence complexidade', 'design'),
  ('Personalização aumenta CTR', 'audience'),
  ('A/B test precisa de 2 semanas mínimo', 'technical')
ON CONFLICT (tag_name) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_track_record_results_track_record ON track_record_results(track_record_id);
CREATE INDEX IF NOT EXISTS idx_track_record_results_quality ON track_record_results(quality_score);
CREATE INDEX IF NOT EXISTS idx_track_record_learnings_track_record ON track_record_learnings(track_record_id);
CREATE INDEX IF NOT EXISTS idx_track_record_learnings_category ON track_record_learnings(category);
CREATE INDEX IF NOT EXISTS idx_track_record_attachments_track_record ON track_record_attachments(track_record_id);
CREATE INDEX IF NOT EXISTS idx_track_record_comparisons_track_record ON track_record_comparisons(track_record_id);

-- View para relatório completo
CREATE OR REPLACE VIEW track_record_full_report AS
SELECT 
  tr.*,
  trr.winner_reason,
  trr.test_duration_days,
  trr.confidence_level,
  trr.statistical_significance,
  trr.uplift_percentage,
  trr.quality_score,
  trr.what_worked,
  trr.what_didnt_work,
  trr.next_steps,
  trr.key_takeaway,
  COUNT(DISTINCT trl.id) as learning_tags_count,
  COUNT(DISTINCT tra.id) as attachments_count,
  wv.variation_name as winner_variation_name
FROM track_records tr
LEFT JOIN track_record_results trr ON tr.id = trr.track_record_id
LEFT JOIN track_record_learnings trl ON tr.id = trl.track_record_id
LEFT JOIN track_record_attachments tra ON tr.id = tra.track_record_id
LEFT JOIN track_record_variations wv ON tr.winner_variation_id = wv.id
GROUP BY 
  tr.id, tr.organization_id, tr.track_record_id, tr.start_date, 
  tr.test_type, tr.hypothesis, tr.channel, tr.status, 
  tr.winner_variation_id, tr.insights, tr.created_by, 
  tr.created_at, tr.updated_at,
  trr.winner_reason, trr.test_duration_days, trr.confidence_level,
  trr.statistical_significance, trr.uplift_percentage, trr.quality_score,
  trr.what_worked, trr.what_didnt_work, trr.next_steps, trr.key_takeaway,
  wv.variation_name;

-- RLS Policies
ALTER TABLE track_record_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_tags_library ENABLE ROW LEVEL SECURITY;

-- Removendo políticas existentes se houver
DROP POLICY IF EXISTS "Users can view results in their org" ON track_record_results;
DROP POLICY IF EXISTS "Users can insert results in their org" ON track_record_results;
DROP POLICY IF EXISTS "Users can update results in their org" ON track_record_results;
DROP POLICY IF EXISTS "Users can manage learnings in their org" ON track_record_learnings;
DROP POLICY IF EXISTS "Users can manage attachments in their org" ON track_record_attachments;
DROP POLICY IF EXISTS "Users can view comparisons in their org" ON track_record_comparisons;
DROP POLICY IF EXISTS "Everyone can read tags library" ON learning_tags_library;

-- Criando políticas com DO blocks para evitar erros
DO $$ 
BEGIN
  -- Policies para track_record_results
  CREATE POLICY "Users can view results in their org" ON track_record_results
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_results.track_record_id 
        AND tr.organization_id = (
          SELECT organization_id 
          FROM profiles 
          WHERE profiles.id = (auth.uid())::UUID
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can insert results in their org" ON track_record_results
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_results.track_record_id 
        AND tr.organization_id = (
          SELECT organization_id 
          FROM profiles 
          WHERE profiles.id = (auth.uid())::UUID
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can update results in their org" ON track_record_results
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_results.track_record_id 
        AND tr.organization_id = (
          SELECT organization_id 
          FROM profiles 
          WHERE profiles.id = (auth.uid())::UUID
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Similar policies for other tables
DO $$ 
BEGIN
  CREATE POLICY "Users can manage learnings in their org" ON track_record_learnings
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_learnings.track_record_id 
        AND tr.organization_id = (
          SELECT organization_id 
          FROM profiles 
          WHERE profiles.id = (auth.uid())::UUID
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can manage attachments in their org" ON track_record_attachments
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_attachments.track_record_id 
        AND tr.organization_id = (
          SELECT organization_id 
          FROM profiles 
          WHERE profiles.id = (auth.uid())::UUID
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can view comparisons in their org" ON track_record_comparisons
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_comparisons.track_record_id 
        AND tr.organization_id = (
          SELECT organization_id 
          FROM profiles 
          WHERE profiles.id = (auth.uid())::UUID
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Everyone can read the tags library
DO $$ 
BEGIN
  CREATE POLICY "Everyone can read tags library" ON learning_tags_library
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Function to calculate statistical significance
CREATE OR REPLACE FUNCTION calculate_statistical_significance(
  sample_a INTEGER,
  conversions_a INTEGER,
  sample_b INTEGER,
  conversions_b INTEGER,
  confidence_level DECIMAL DEFAULT 95.00
) RETURNS JSONB AS $$
DECLARE
  rate_a DECIMAL;
  rate_b DECIMAL;
  pooled_rate DECIMAL;
  standard_error DECIMAL;
  z_score DECIMAL;
  z_critical DECIMAL;
  is_significant BOOLEAN;
  uplift DECIMAL;
BEGIN
  -- Calculate conversion rates
  rate_a := conversions_a::DECIMAL / NULLIF(sample_a, 0);
  rate_b := conversions_b::DECIMAL / NULLIF(sample_b, 0);
  
  -- Calculate pooled conversion rate
  pooled_rate := (conversions_a + conversions_b)::DECIMAL / NULLIF(sample_a + sample_b, 0);
  
  -- Calculate standard error
  standard_error := SQRT(
    pooled_rate * (1 - pooled_rate) * (1.0/sample_a + 1.0/sample_b)
  );
  
  -- Calculate z-score
  z_score := ABS(rate_a - rate_b) / NULLIF(standard_error, 0);
  
  -- Determine z-critical based on confidence level
  z_critical := CASE 
    WHEN confidence_level >= 99 THEN 2.576
    WHEN confidence_level >= 95 THEN 1.96
    WHEN confidence_level >= 90 THEN 1.645
    ELSE 1.96
  END;
  
  -- Check if significant
  is_significant := z_score > z_critical;
  
  -- Calculate uplift
  uplift := ((rate_b - rate_a) / NULLIF(rate_a, 0)) * 100;
  
  RETURN jsonb_build_object(
    'is_significant', is_significant,
    'z_score', ROUND(z_score, 3),
    'confidence_level', confidence_level,
    'rate_a', ROUND(rate_a * 100, 2),
    'rate_b', ROUND(rate_b * 100, 2),
    'uplift_percentage', ROUND(uplift, 2),
    'sample_size_a', sample_a,
    'sample_size_b', sample_b
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quality score automatically
CREATE OR REPLACE FUNCTION update_quality_score()
RETURNS TRIGGER AS $$
DECLARE
  score INTEGER := 0;
  has_sufficient_sample BOOLEAN;
  has_winner BOOLEAN;
  has_insights BOOLEAN;
  has_learnings BOOLEAN;
  has_attachments BOOLEAN;
BEGIN
  -- Check sample size (at least 100 per variation)
  SELECT (NEW.total_sample_size / 2) >= 100 INTO has_sufficient_sample;
  
  -- Check if winner is selected
  SELECT winner_variation_id IS NOT NULL INTO has_winner
  FROM track_records WHERE id = NEW.track_record_id;
  
  -- Check if insights are documented
  has_insights := NEW.what_worked IS NOT NULL AND NEW.what_didnt_work IS NOT NULL;
  
  -- Check if learnings are tagged
  SELECT COUNT(*) > 0 INTO has_learnings
  FROM track_record_learnings WHERE track_record_id = NEW.track_record_id;
  
  -- Check if attachments exist
  SELECT COUNT(*) > 0 INTO has_attachments
  FROM track_record_attachments WHERE track_record_id = NEW.track_record_id;
  
  -- Calculate score
  IF has_sufficient_sample THEN score := score + 1; END IF;
  IF has_winner THEN score := score + 1; END IF;
  IF has_insights THEN score := score + 1; END IF;
  IF has_learnings THEN score := score + 1; END IF;
  IF NEW.statistical_significance THEN score := score + 1; END IF;
  
  -- Ensure minimum score of 1
  NEW.quality_score := GREATEST(score, 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS trigger_update_quality_score ON track_record_results;

CREATE TRIGGER trigger_update_quality_score
  BEFORE INSERT OR UPDATE ON track_record_results
  FOR EACH ROW EXECUTE FUNCTION update_quality_score();