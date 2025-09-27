-- ========================================
-- Sistema de Financeiro Interno - Admin Only
-- ========================================
-- Sistema completo para gestão financeira interna
-- Acessível apenas para administradores

-- Tabela principal dos dados financeiros internos
CREATE TABLE IF NOT EXISTS internal_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
  
  -- Entradas
  faturamento_bruto DECIMAL(15,2) NOT NULL DEFAULT 0,
  numero_vendas INTEGER NOT NULL DEFAULT 0,
  
  -- Saídas - Custos Fixos
  custos_fixos DECIMAL(15,2) DEFAULT 0, -- Total de custos fixos
  equipe_fixa DECIMAL(15,2) DEFAULT 0, -- Custos com equipe fixa
  ferramentas DECIMAL(15,2) DEFAULT 0, -- Custos com ferramentas
  
  -- Saídas - Custos Variáveis
  custos_variaveis DECIMAL(15,2) DEFAULT 0, -- Total de custos variáveis
  trafego_pago DECIMAL(15,2) DEFAULT 0, -- Investimento em tráfego
  chargebacks_reembolsos DECIMAL(15,2) DEFAULT 0, -- Chargebacks e reembolsos
  
  -- Percentuais configuráveis
  taxa_plataforma_percentual DECIMAL(5,2) DEFAULT 4.99, -- % Taxa da plataforma (aplicado sobre faturamento bruto)
  imposto_percentual DECIMAL(5,2) DEFAULT 10.00, -- % Impostos (aplicado sobre faturamento bruto)
  gestor_trafego_percentual DECIMAL(5,2) DEFAULT 15.00, -- % Comissão gestor de tráfego (aplicado sobre lucro líquido)
  copywriter_percentual DECIMAL(5,2) DEFAULT 10.00, -- % Comissão copywriter (aplicado sobre lucro líquido)
  
  -- Valores calculados automaticamente
  taxa_plataforma DECIMAL(15,2) DEFAULT 0,
  imposto DECIMAL(15,2) DEFAULT 0,
  comissao_gestor_trafego DECIMAL(15,2) DEFAULT 0,
  comissao_copywriter DECIMAL(15,2) DEFAULT 0,
  
  -- Indicadores calculados
  roi DECIMAL(8,2) DEFAULT 0, -- ROI em porcentagem
  cac DECIMAL(10,2) DEFAULT 0, -- Custo de Aquisição de Cliente
  ticket_medio DECIMAL(10,2) DEFAULT 0, -- Ticket Médio
  percentual_reembolso_chargeback DECIMAL(5,2) DEFAULT 0, -- % Reembolsos e Chargebacks
  margem_contribuicao DECIMAL(15,2) DEFAULT 0, -- Margem de Contribuição
  lucro_liquido DECIMAL(15,2) DEFAULT 0, -- Lucro Líquido
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint para evitar duplicação de mês/ano
  UNIQUE(month, year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_internal_financial_data_date ON internal_financial_data(year, month);

-- Função para recalcular todos os valores automaticamente
CREATE OR REPLACE FUNCTION calculate_internal_financial_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular valores baseados nos percentuais (sobre faturamento bruto)
  NEW.taxa_plataforma := (NEW.faturamento_bruto * NEW.taxa_plataforma_percentual / 100);
  NEW.imposto := (NEW.faturamento_bruto * NEW.imposto_percentual / 100);
  
  -- Primeiro calcular custos sem comissões
  NEW.custos_variaveis := NEW.trafego_pago + NEW.taxa_plataforma + NEW.imposto + NEW.chargebacks_reembolsos;
  NEW.custos_fixos := NEW.equipe_fixa + NEW.ferramentas;
  
  -- Calcular margem e lucro sem comissões
  NEW.margem_contribuicao := NEW.faturamento_bruto - NEW.custos_variaveis;
  NEW.lucro_liquido := NEW.margem_contribuicao - NEW.custos_fixos;
  
  -- Agora calcular comissões baseadas no lucro líquido
  NEW.comissao_gestor_trafego := (NEW.lucro_liquido * NEW.gestor_trafego_percentual / 100);
  NEW.comissao_copywriter := (NEW.lucro_liquido * NEW.copywriter_percentual / 100);
  
  -- Recalcular custos variáveis incluindo comissões
  NEW.custos_variaveis := NEW.trafego_pago + NEW.taxa_plataforma + NEW.imposto + 
                         NEW.chargebacks_reembolsos + NEW.comissao_gestor_trafego + NEW.comissao_copywriter;
  
  -- Recalcular margem e lucro final
  NEW.margem_contribuicao := NEW.faturamento_bruto - NEW.custos_variaveis;
  NEW.lucro_liquido := NEW.margem_contribuicao - NEW.custos_fixos;
  
  -- Calcular indicadores
  -- Ticket Médio
  IF NEW.numero_vendas > 0 THEN
    NEW.ticket_medio := NEW.faturamento_bruto / NEW.numero_vendas;
    -- CAC (Custo de Aquisição de Cliente)
    NEW.cac := NEW.trafego_pago / NEW.numero_vendas;
  ELSE
    NEW.ticket_medio := 0;
    NEW.cac := 0;
  END IF;
  
  -- Percentual de Reembolso e Chargeback
  IF NEW.faturamento_bruto > 0 THEN
    NEW.percentual_reembolso_chargeback := (NEW.chargebacks_reembolsos / NEW.faturamento_bruto) * 100;
  ELSE
    NEW.percentual_reembolso_chargeback := 0;
  END IF;
  
  -- ROI (Lucro Líquido / Tráfego Pago * 100)
  IF NEW.trafego_pago > 0 THEN
    NEW.roi := (NEW.lucro_liquido / NEW.trafego_pago) * 100;
  ELSE
    NEW.roi := 0;
  END IF;
  
  -- Atualizar timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recálculo automático
DROP TRIGGER IF EXISTS trigger_calculate_internal_financial ON internal_financial_data;
CREATE TRIGGER trigger_calculate_internal_financial
  BEFORE INSERT OR UPDATE ON internal_financial_data
  FOR EACH ROW EXECUTE FUNCTION calculate_internal_financial_indicators();

-- Habilitar RLS (Row Level Security)
ALTER TABLE internal_financial_data ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança - APENAS ADMINS
CREATE POLICY "Only admins can view internal financial data" ON internal_financial_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

CREATE POLICY "Only admins can insert internal financial data" ON internal_financial_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

CREATE POLICY "Only admins can update internal financial data" ON internal_financial_data
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

CREATE POLICY "Only admins can delete internal financial data" ON internal_financial_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

-- Comentários
COMMENT ON TABLE internal_financial_data IS 'Sistema de financeiro interno - acesso apenas para administradores';
COMMENT ON COLUMN internal_financial_data.faturamento_bruto IS 'Faturamento bruto mensal';
COMMENT ON COLUMN internal_financial_data.numero_vendas IS 'Número de vendas no mês';
COMMENT ON COLUMN internal_financial_data.roi IS 'ROI em porcentagem (Lucro Líquido / Tráfego Pago * 100)';
COMMENT ON COLUMN internal_financial_data.cac IS 'Custo de Aquisição de Cliente (Tráfego Pago / Número de Vendas)';
COMMENT ON COLUMN internal_financial_data.ticket_medio IS 'Ticket médio (Faturamento Bruto / Número de Vendas)';
COMMENT ON COLUMN internal_financial_data.margem_contribuicao IS 'Margem de Contribuição (Faturamento - Custos Variáveis)';
COMMENT ON COLUMN internal_financial_data.lucro_liquido IS 'Lucro Líquido (Margem de Contribuição - Custos Fixos)';