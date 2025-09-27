-- ========================================
-- Remoção do Sistema de Afiliados
-- ========================================
-- Remove campos e cálculos relacionados a afiliados do sistema financeiro

-- Remover campo de percentual de afiliados
ALTER TABLE internal_financial_data DROP COLUMN IF EXISTS afiliados_percentual;

-- Remover campo de pagamentos a afiliados 
ALTER TABLE internal_financial_data DROP COLUMN IF EXISTS pagamentos_afiliados;

-- Recriar função de cálculo sem afiliados
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

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_calculate_internal_financial ON internal_financial_data;
CREATE TRIGGER trigger_calculate_internal_financial
  BEFORE INSERT OR UPDATE ON internal_financial_data
  FOR EACH ROW EXECUTE FUNCTION calculate_internal_financial_indicators();

-- Comentários
COMMENT ON COLUMN internal_financial_data.gestor_trafego_percentual IS 'Percentual de comissão do gestor de tráfego aplicado sobre lucro líquido';
COMMENT ON COLUMN internal_financial_data.copywriter_percentual IS 'Percentual de comissão do copywriter aplicado sobre lucro líquido';