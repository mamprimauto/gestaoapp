-- ========================================
-- OKR System Tables - Simplified Version
-- ========================================
-- Sistema simplificado de OKRs sem dependências complexas

-- Tabela principal de OKRs
CREATE TABLE IF NOT EXISTS okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID, -- Optional organization reference
  week INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  focus TEXT,
  status TEXT CHECK (status IN ('completed', 'current', 'planned')) DEFAULT 'planned',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
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
  assignee_id UUID,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de responsáveis pelos Key Results (many-to-many)
CREATE TABLE IF NOT EXISTS okr_assignees (
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key_result_id, user_id)
);

-- ========================================
-- Indexes para performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_okrs_week_year ON okrs(week, year);
CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_tasks_key_result ON okr_tasks(key_result_id);
CREATE INDEX IF NOT EXISTS idx_okr_tasks_assignee ON okr_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_okr_assignees_key_result ON okr_assignees(key_result_id);
CREATE INDEX IF NOT EXISTS idx_okr_assignees_user ON okr_assignees(user_id);

-- ========================================
-- RLS Policies - Simplified (Allow all authenticated users)
-- ========================================

-- Enable RLS
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_assignees ENABLE ROW LEVEL SECURITY;

-- OKRs - Allow all authenticated users
CREATE POLICY "Authenticated users can view OKRs"
  ON okrs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create OKRs"
  ON okrs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update OKRs"
  ON okrs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete OKRs"
  ON okrs FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Key Results - Allow all authenticated users
CREATE POLICY "Authenticated users can view key results"
  ON key_results FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create key results"
  ON key_results FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update key results"
  ON key_results FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete key results"
  ON key_results FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- OKR Tasks - Allow all authenticated users
CREATE POLICY "Authenticated users can view tasks"
  ON okr_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tasks"
  ON okr_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tasks"
  ON okr_tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tasks"
  ON okr_tasks FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- OKR Assignees - Allow all authenticated users
CREATE POLICY "Authenticated users can view assignees"
  ON okr_assignees FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage assignees"
  ON okr_assignees FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ========================================
-- Trigger para atualizar updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_okrs_updated_at 
  BEFORE UPDATE ON okrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at 
  BEFORE UPDATE ON key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_okr_tasks_updated_at 
  BEFORE UPDATE ON okr_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();