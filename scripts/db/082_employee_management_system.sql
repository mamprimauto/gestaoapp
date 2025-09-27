-- ========================================
-- Sistema de Gestão de Colaboradores
-- ========================================
-- Tabela para gestão individual de colaboradores por período financeiro

-- Tabela de colaboradores por período financeiro
CREATE TABLE IF NOT EXISTS financial_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_data_id UUID NOT NULL REFERENCES internal_financial_data(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100) NOT NULL,
  salario DECIMAL(10,2) NOT NULL CHECK (salario >= 0),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_employees_financial_data_id ON financial_employees(financial_data_id);
CREATE INDEX IF NOT EXISTS idx_financial_employees_cargo ON financial_employees(cargo);

-- Habilitar RLS
ALTER TABLE financial_employees ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança - APENAS ADMINS (mesmas regras da tabela principal)
CREATE POLICY "Only admins can view financial employees" ON financial_employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

CREATE POLICY "Only admins can insert financial employees" ON financial_employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

CREATE POLICY "Only admins can update financial employees" ON financial_employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

CREATE POLICY "Only admins can delete financial employees" ON financial_employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

-- Função para recalcular equipe_fixa baseado nos colaboradores cadastrados
CREATE OR REPLACE FUNCTION recalculate_team_costs()
RETURNS TRIGGER AS $$
DECLARE
  financial_id UUID;
  total_salarios DECIMAL(15,2);
BEGIN
  -- Determinar o ID do registro financeiro
  IF TG_OP = 'DELETE' THEN
    financial_id := OLD.financial_data_id;
  ELSE
    financial_id := NEW.financial_data_id;
  END IF;
  
  -- Calcular total de salários para este período
  SELECT COALESCE(SUM(salario), 0) INTO total_salarios
  FROM financial_employees 
  WHERE financial_data_id = financial_id;
  
  -- Atualizar o campo equipe_fixa na tabela principal
  UPDATE internal_financial_data 
  SET equipe_fixa = total_salarios,
      updated_at = now()
  WHERE id = financial_id;
  
  -- Retornar o registro apropriado baseado na operação
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers para recálculo automático
DROP TRIGGER IF EXISTS trigger_recalculate_team_costs_insert ON financial_employees;
CREATE TRIGGER trigger_recalculate_team_costs_insert
  AFTER INSERT ON financial_employees
  FOR EACH ROW EXECUTE FUNCTION recalculate_team_costs();

DROP TRIGGER IF EXISTS trigger_recalculate_team_costs_update ON financial_employees;
CREATE TRIGGER trigger_recalculate_team_costs_update
  AFTER UPDATE ON financial_employees
  FOR EACH ROW EXECUTE FUNCTION recalculate_team_costs();

DROP TRIGGER IF EXISTS trigger_recalculate_team_costs_delete ON financial_employees;
CREATE TRIGGER trigger_recalculate_team_costs_delete
  AFTER DELETE ON financial_employees
  FOR EACH ROW EXECUTE FUNCTION recalculate_team_costs();

-- Comentários
COMMENT ON TABLE financial_employees IS 'Colaboradores vinculados a períodos financeiros específicos';
COMMENT ON COLUMN financial_employees.financial_data_id IS 'Referência ao período financeiro';
COMMENT ON COLUMN financial_employees.nome IS 'Nome do colaborador';
COMMENT ON COLUMN financial_employees.cargo IS 'Cargo/função do colaborador';
COMMENT ON COLUMN financial_employees.salario IS 'Salário mensal do colaborador';