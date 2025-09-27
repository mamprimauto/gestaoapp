-- ========================================
-- RESET E RECRIAÇÃO DO SISTEMA OKR
-- ========================================
-- Este script remove tudo e recria do zero

-- 1. Primeiro, remove todas as políticas existentes
DROP POLICY IF EXISTS "Authenticated users can view OKRs" ON okrs;
DROP POLICY IF EXISTS "Authenticated users can create OKRs" ON okrs;
DROP POLICY IF EXISTS "Authenticated users can update OKRs" ON okrs;
DROP POLICY IF EXISTS "Authenticated users can delete OKRs" ON okrs;
DROP POLICY IF EXISTS "Organization members can view OKRs" ON okrs;
DROP POLICY IF EXISTS "Organization members can create OKRs" ON okrs;
DROP POLICY IF EXISTS "Organization members can update OKRs" ON okrs;
DROP POLICY IF EXISTS "Admin can delete OKRs" ON okrs;

DROP POLICY IF EXISTS "Authenticated users can view key results" ON key_results;
DROP POLICY IF EXISTS "Authenticated users can create key results" ON key_results;
DROP POLICY IF EXISTS "Authenticated users can update key results" ON key_results;
DROP POLICY IF EXISTS "Authenticated users can delete key results" ON key_results;
DROP POLICY IF EXISTS "View key results of visible OKRs" ON key_results;
DROP POLICY IF EXISTS "Create key results in organization OKRs" ON key_results;
DROP POLICY IF EXISTS "Update key results in organization" ON key_results;
DROP POLICY IF EXISTS "Admin can delete key results" ON key_results;

DROP POLICY IF EXISTS "Authenticated users can view tasks" ON okr_tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON okr_tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON okr_tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON okr_tasks;
DROP POLICY IF EXISTS "View tasks of visible key results" ON okr_tasks;
DROP POLICY IF EXISTS "Create tasks in organization key results" ON okr_tasks;
DROP POLICY IF EXISTS "Update tasks in organization" ON okr_tasks;
DROP POLICY IF EXISTS "Admin can delete tasks" ON okr_tasks;

DROP POLICY IF EXISTS "Authenticated users can view assignees" ON okr_assignees;
DROP POLICY IF EXISTS "Authenticated users can manage assignees" ON okr_assignees;
DROP POLICY IF EXISTS "View assignees of visible key results" ON okr_assignees;
DROP POLICY IF EXISTS "Manage assignees in organization" ON okr_assignees;

-- 2. Remove triggers se existirem
DROP TRIGGER IF EXISTS update_okrs_updated_at ON okrs;
DROP TRIGGER IF EXISTS update_key_results_updated_at ON key_results;
DROP TRIGGER IF EXISTS update_okr_tasks_updated_at ON okr_tasks;

-- 3. Remove função se existir
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 4. Remove as tabelas (CASCADE remove dependências)
DROP TABLE IF EXISTS okr_assignees CASCADE;
DROP TABLE IF EXISTS okr_tasks CASCADE;
DROP TABLE IF EXISTS key_results CASCADE;
DROP TABLE IF EXISTS okrs CASCADE;

-- ========================================
-- RECRIA TUDO DO ZERO
-- ========================================

-- Tabela principal de OKRs
CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
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
CREATE TABLE key_results (
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
CREATE TABLE okr_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  assignee_id UUID,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de responsáveis pelos Key Results
CREATE TABLE okr_assignees (
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key_result_id, user_id)
);

-- Indexes para performance
CREATE INDEX idx_okrs_week_year ON okrs(week, year);
CREATE INDEX idx_key_results_okr ON key_results(okr_id);
CREATE INDEX idx_okr_tasks_key_result ON okr_tasks(key_result_id);
CREATE INDEX idx_okr_tasks_assignee ON okr_tasks(assignee_id);
CREATE INDEX idx_okr_assignees_key_result ON okr_assignees(key_result_id);
CREATE INDEX idx_okr_assignees_user ON okr_assignees(user_id);

-- ========================================
-- RLS Policies Simplificadas
-- ========================================

-- Enable RLS
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_assignees ENABLE ROW LEVEL SECURITY;

-- Políticas super simples - todos os usuários autenticados podem tudo
CREATE POLICY "Users can do everything with OKRs"
  ON okrs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can do everything with key results"
  ON key_results FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can do everything with tasks"
  ON okr_tasks FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can do everything with assignees"
  ON okr_assignees FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================
-- Função para atualizar updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_okrs_updated_at 
  BEFORE UPDATE ON okrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at 
  BEFORE UPDATE ON key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_okr_tasks_updated_at 
  BEFORE UPDATE ON okr_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Mensagem de sucesso
-- ========================================
-- Se você chegou até aqui sem erros, o sistema OKR foi recriado com sucesso!
-- Agora:
-- 1. Habilite Realtime em Database > Replication para as 4 tabelas
-- 2. Reinicie seu servidor Next.js
-- 3. Teste criar, editar e deletar OKRs