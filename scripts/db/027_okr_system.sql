-- ========================================
-- OKR System Tables
-- ========================================
-- Sistema completo de OKRs com Key Results e Tarefas
-- Integrado com sistema de organizações existente

-- Tabela principal de OKRs
CREATE TABLE IF NOT EXISTS okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  focus TEXT,
  status TEXT CHECK (status IN ('completed', 'current', 'planned')) DEFAULT 'planned',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint para evitar duplicação de semanas
  UNIQUE(organization_id, week, year)
);

-- Tabela de Key Results
CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 0,
  current INTEGER NOT NULL DEFAULT 0,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de tarefas dos Key Results
CREATE TABLE IF NOT EXISTS okr_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  assignee_id UUID REFERENCES profiles(id),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de responsáveis pelos Key Results (many-to-many)
CREATE TABLE IF NOT EXISTS okr_assignees (
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key_result_id, user_id)
);

-- ========================================
-- Indexes para performance
-- ========================================
CREATE INDEX idx_okrs_organization ON okrs(organization_id);
CREATE INDEX idx_okrs_week_year ON okrs(week, year);
CREATE INDEX idx_key_results_okr ON key_results(okr_id);
CREATE INDEX idx_okr_tasks_key_result ON okr_tasks(key_result_id);
CREATE INDEX idx_okr_tasks_assignee ON okr_tasks(assignee_id);
CREATE INDEX idx_okr_assignees_key_result ON okr_assignees(key_result_id);
CREATE INDEX idx_okr_assignees_user ON okr_assignees(user_id);

-- ========================================
-- RLS Policies
-- ========================================

-- Enable RLS
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_assignees ENABLE ROW LEVEL SECURITY;

-- OKRs Policies
-- Membros da organização podem ver OKRs
CREATE POLICY "Organization members can view OKRs"
  ON okrs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = okrs.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Membros podem criar OKRs
CREATE POLICY "Organization members can create OKRs"
  ON okrs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = okrs.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Membros podem atualizar OKRs
CREATE POLICY "Organization members can update OKRs"
  ON okrs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = okrs.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Apenas admin/gestor pode deletar OKRs
CREATE POLICY "Admin can delete OKRs"
  ON okrs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organization_members om ON om.user_id = p.id
      WHERE om.organization_id = okrs.organization_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'gestor_trafego')
    )
  );

-- Key Results Policies
-- Ver KRs dos OKRs visíveis
CREATE POLICY "View key results of visible OKRs"
  ON key_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM okrs o
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE o.id = key_results.okr_id
      AND om.user_id = auth.uid()
    )
  );

-- Criar KRs em OKRs da organização
CREATE POLICY "Create key results in organization OKRs"
  ON key_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM okrs o
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE o.id = key_results.okr_id
      AND om.user_id = auth.uid()
    )
  );

-- Atualizar KRs da organização
CREATE POLICY "Update key results in organization"
  ON key_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM okrs o
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE o.id = key_results.okr_id
      AND om.user_id = auth.uid()
    )
  );

-- Deletar KRs (admin/gestor)
CREATE POLICY "Admin can delete key results"
  ON key_results FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM okrs o
      JOIN organization_members om ON om.organization_id = o.organization_id
      JOIN profiles p ON p.id = om.user_id
      WHERE o.id = key_results.okr_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'gestor_trafego')
    )
  );

-- OKR Tasks Policies
-- Ver tarefas dos KRs visíveis
CREATE POLICY "View tasks of visible key results"
  ON okr_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM key_results kr
      JOIN okrs o ON o.id = kr.okr_id
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE kr.id = okr_tasks.key_result_id
      AND om.user_id = auth.uid()
    )
  );

-- Criar tarefas
CREATE POLICY "Create tasks in organization key results"
  ON okr_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM key_results kr
      JOIN okrs o ON o.id = kr.okr_id
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE kr.id = okr_tasks.key_result_id
      AND om.user_id = auth.uid()
    )
  );

-- Atualizar tarefas
CREATE POLICY "Update tasks in organization"
  ON okr_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM key_results kr
      JOIN okrs o ON o.id = kr.okr_id
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE kr.id = okr_tasks.key_result_id
      AND om.user_id = auth.uid()
    )
  );

-- Deletar tarefas
CREATE POLICY "Delete tasks in organization"
  ON okr_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM key_results kr
      JOIN okrs o ON o.id = kr.okr_id
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE kr.id = okr_tasks.key_result_id
      AND om.user_id = auth.uid()
    )
  );

-- OKR Assignees Policies
-- Ver responsáveis
CREATE POLICY "View assignees of visible key results"
  ON okr_assignees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM key_results kr
      JOIN okrs o ON o.id = kr.okr_id
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE kr.id = okr_assignees.key_result_id
      AND om.user_id = auth.uid()
    )
  );

-- ========================================
-- Functions para atualizar timestamps
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_okrs_updated_at
  BEFORE UPDATE ON okrs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_key_results_updated_at
  BEFORE UPDATE ON key_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_okr_tasks_updated_at
  BEFORE UPDATE ON okr_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ========================================
-- Function para calcular progresso automaticamente
-- ========================================
CREATE OR REPLACE FUNCTION calculate_key_result_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o current do key_result baseado nas tarefas completadas
  UPDATE key_results
  SET current = (
    SELECT COUNT(*) 
    FROM okr_tasks 
    WHERE key_result_id = NEW.key_result_id 
    AND completed = true
  )
  WHERE id = NEW.key_result_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular progresso quando tarefa é atualizada
CREATE TRIGGER update_key_result_progress
  AFTER INSERT OR UPDATE OR DELETE ON okr_tasks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_key_result_progress();

-- ========================================
-- Dados de exemplo para teste
-- ========================================
-- Isso será executado apenas se não houver OKRs ainda
DO $$
DECLARE
  v_org_id UUID;
  v_okr_id UUID;
  v_kr_id UUID;
  v_user1_id UUID;
  v_user2_id UUID;
BEGIN
  -- Pega a primeira organização disponível
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  
  -- Pega dois usuários para exemplo
  SELECT id INTO v_user1_id FROM profiles WHERE email = 'igorzimpel@gmail.com';
  SELECT id INTO v_user2_id FROM profiles WHERE email = 'demo@trafficpro.local';
  
  -- Se encontrou organização e usuários, cria dados de exemplo
  IF v_org_id IS NOT NULL AND v_user1_id IS NOT NULL THEN
    -- Verifica se já existem OKRs
    IF NOT EXISTS (SELECT 1 FROM okrs WHERE organization_id = v_org_id) THEN
      -- Cria OKR da semana atual (33)
      INSERT INTO okrs (organization_id, week, year, title, focus, status, created_by)
      VALUES (
        v_org_id,
        33,
        2025,
        'Acelerar testes e otimizar funis',
        'Volume de testes + Qualidade dos leads',
        'current',
        v_user1_id
      ) RETURNING id INTO v_okr_id;
      
      -- Cria primeiro Key Result
      INSERT INTO key_results (okr_id, title, target, current, priority, position)
      VALUES (
        v_okr_id,
        'Testar 42 criativos na semana',
        42,
        0,
        'high',
        1
      ) RETURNING id INTO v_kr_id;
      
      -- Adiciona responsáveis ao KR
      INSERT INTO okr_assignees (key_result_id, user_id)
      VALUES 
        (v_kr_id, v_user1_id),
        (v_kr_id, v_user2_id);
      
      -- Adiciona tarefas ao KR
      INSERT INTO okr_tasks (key_result_id, title, completed, assignee_id, position)
      VALUES 
        (v_kr_id, 'Criar 15 criativos produto A', false, v_user1_id, 1),
        (v_kr_id, 'Testar 20 criativos Facebook', false, v_user2_id, 2),
        (v_kr_id, 'Analisar performance criativos', false, v_user1_id, 3);
      
      RAISE NOTICE 'Dados de exemplo OKR criados com sucesso';
    END IF;
  END IF;
END $$;