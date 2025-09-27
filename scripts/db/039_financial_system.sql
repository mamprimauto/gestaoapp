-- ========================================
-- Sistema Financeiro - Dashboard
-- ========================================
-- Sistema completo de gestão financeira mensal
-- Integrado com sistema de organizações existente

-- Tabela principal de dados financeiros mensais
CREATE TABLE IF NOT EXISTS financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
  
  -- Dados financeiros principais
  revenue DECIMAL(15,2) NOT NULL DEFAULT 0, -- faturamento
  facebook_investment DECIMAL(15,2) DEFAULT 0,
  google_investment DECIMAL(15,2) DEFAULT 0,
  taxes DECIMAL(15,2) DEFAULT 0, -- impostos
  tax_percentage DECIMAL(5,2) DEFAULT 10.00, -- % de imposto configurável
  return_percentage DECIMAL(5,2) DEFAULT 24.10, -- % devoluções
  profit_percentage DECIMAL(5,2) DEFAULT 15.00, -- % comissão do usuário
  
  -- Totais calculados (podem ser cachados)
  total_tools_cost DECIMAL(15,2) DEFAULT 0,
  total_employee_cost DECIMAL(15,2) DEFAULT 0,
  net_profit DECIMAL(15,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint para evitar duplicação de mês/ano por organização
  UNIQUE(organization_id, month, year)
);

-- Tabela de ferramentas/custos operacionais
CREATE TABLE IF NOT EXISTS financial_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_data_id UUID REFERENCES financial_data(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'software', -- software, hardware, service, other
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de colaboradores/custos fixos
CREATE TABLE IF NOT EXISTS financial_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_data_id UUID REFERENCES financial_data(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- função/cargo
  salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  department TEXT DEFAULT 'geral', -- editor, copywriter, gestor_trafego, minerador, admin
  employment_type TEXT DEFAULT 'clt', -- clt, pj, freelancer
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de metas financeiras (opcional)
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
  target_revenue DECIMAL(15,2) DEFAULT 0,
  target_profit_margin DECIMAL(5,2) DEFAULT 0,
  max_facebook_investment DECIMAL(15,2) DEFAULT 0,
  max_google_investment DECIMAL(15,2) DEFAULT 0,
  max_tools_cost DECIMAL(15,2) DEFAULT 0,
  max_employee_cost DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, month, year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_data_org_date ON financial_data(organization_id, year, month);
CREATE INDEX IF NOT EXISTS idx_financial_tools_data_id ON financial_tools(financial_data_id);
CREATE INDEX IF NOT EXISTS idx_financial_employees_data_id ON financial_employees(financial_data_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_org_date ON financial_goals(organization_id, year, month);

-- Função para recalcular totais automaticamente
CREATE OR REPLACE FUNCTION update_financial_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular custos de ferramentas
  UPDATE financial_data 
  SET total_tools_cost = (
    SELECT COALESCE(SUM(cost), 0) 
    FROM financial_tools 
    WHERE financial_data_id = NEW.financial_data_id AND is_active = true
  )
  WHERE id = NEW.financial_data_id;
  
  -- Recalcular custos de colaboradores
  UPDATE financial_data 
  SET total_employee_cost = (
    SELECT COALESCE(SUM(salary), 0) 
    FROM financial_employees 
    WHERE financial_data_id = NEW.financial_data_id AND is_active = true
  )
  WHERE id = NEW.financial_data_id;
  
  -- Recalcular lucro líquido e margem
  UPDATE financial_data 
  SET 
    net_profit = revenue - facebook_investment - google_investment - taxes - total_tools_cost - total_employee_cost,
    profit_margin = CASE 
      WHEN revenue > 0 THEN ((revenue - facebook_investment - google_investment - taxes - total_tools_cost - total_employee_cost) / revenue) * 100
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = NEW.financial_data_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para recálculo automático
DROP TRIGGER IF EXISTS trigger_update_financial_totals_tools ON financial_tools;
CREATE TRIGGER trigger_update_financial_totals_tools
  AFTER INSERT OR UPDATE OR DELETE ON financial_tools
  FOR EACH ROW EXECUTE FUNCTION update_financial_totals();

DROP TRIGGER IF EXISTS trigger_update_financial_totals_employees ON financial_employees;
CREATE TRIGGER trigger_update_financial_totals_employees
  AFTER INSERT OR UPDATE OR DELETE ON financial_employees
  FOR EACH ROW EXECUTE FUNCTION update_financial_totals();

-- Função para recalcular totais em financial_data
CREATE OR REPLACE FUNCTION recalculate_financial_data()
RETURNS TRIGGER AS $$
BEGIN
  NEW.taxes = (NEW.revenue * NEW.tax_percentage / 100);
  NEW.net_profit = NEW.revenue - NEW.facebook_investment - NEW.google_investment - NEW.taxes - NEW.total_tools_cost - NEW.total_employee_cost;
  NEW.profit_margin = CASE 
    WHEN NEW.revenue > 0 THEN (NEW.net_profit / NEW.revenue) * 100
    ELSE 0 
  END;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recálculo automático em financial_data
DROP TRIGGER IF EXISTS trigger_recalculate_financial_data ON financial_data;
CREATE TRIGGER trigger_recalculate_financial_data
  BEFORE UPDATE ON financial_data
  FOR EACH ROW EXECUTE FUNCTION recalculate_financial_data();

-- ========================================
-- RLS (Row Level Security)
-- ========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Políticas para financial_data
CREATE POLICY "Users can view financial data from their organization" ON financial_data
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert financial data for their organization" ON financial_data
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update financial data from their organization" ON financial_data
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete financial data from their organization" ON financial_data
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para financial_tools (herda organização via financial_data)
CREATE POLICY "Users can view tools from their organization" ON financial_tools
  FOR SELECT USING (
    financial_data_id IN (
      SELECT id FROM financial_data 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage tools from their organization" ON financial_tools
  FOR ALL USING (
    financial_data_id IN (
      SELECT id FROM financial_data 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Políticas para financial_employees (herda organização via financial_data)
CREATE POLICY "Users can view employees from their organization" ON financial_employees
  FOR SELECT USING (
    financial_data_id IN (
      SELECT id FROM financial_data 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage employees from their organization" ON financial_employees
  FOR ALL USING (
    financial_data_id IN (
      SELECT id FROM financial_data 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Políticas para financial_goals
CREATE POLICY "Users can view goals from their organization" ON financial_goals
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage goals from their organization" ON financial_goals
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- Dados iniciais/seed (opcional)
-- ========================================

-- Inserir algumas ferramentas padrão (será feito via interface)
-- Inserir alguns cargos/departamentos padrão (será feito via interface)

COMMENT ON TABLE financial_data IS 'Dados financeiros mensais por organização';
COMMENT ON TABLE financial_tools IS 'Ferramentas e custos operacionais';
COMMENT ON TABLE financial_employees IS 'Colaboradores e custos fixos de pessoal';
COMMENT ON TABLE financial_goals IS 'Metas financeiras mensais (opcional)';