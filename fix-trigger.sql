-- Corrigir função trigger para funcionar com schema atual
CREATE OR REPLACE FUNCTION calculate_financial_indicators()
RETURNS TRIGGER AS $$
DECLARE
    taxa_plataforma DECIMAL(10,2);
    imposto DECIMAL(10,2);
    lucro_bruto DECIMAL(10,2);
    lucro_liquido DECIMAL(10,2);
    total_custos DECIMAL(10,2);
BEGIN
    -- Calcular valores baseados em percentuais
    taxa_plataforma := NEW.faturamento_bruto * (NEW.taxa_plataforma_percentual / 100);
    imposto := NEW.faturamento_bruto * (NEW.imposto_percentual / 100);
    
    -- Calcular lucro bruto (receita - custos fixos - investimentos - taxa - imposto - chargebacks)
    -- Usando apenas campos que existem atualmente
    lucro_bruto := NEW.faturamento_bruto - 
                   COALESCE(NEW.equipe_fixa, 0) - 
                   COALESCE(NEW.chargebacks_reembolsos, 0) - 
                   taxa_plataforma - 
                   imposto - 
                   COALESCE(NEW.ferramentas, 0);
    
    -- Calcular comissões baseadas no lucro bruto
    NEW.gestor_trafego_valor := lucro_bruto * (NEW.gestor_trafego_percentual / 100);
    NEW.copywriter_valor := lucro_bruto * (NEW.copywriter_percentual / 100);
    
    -- Calcular lucro líquido
    lucro_liquido := lucro_bruto - NEW.gestor_trafego_valor - NEW.copywriter_valor;
    
    -- Calcular total de custos
    total_custos := COALESCE(NEW.equipe_fixa, 0) + 
                    taxa_plataforma + 
                    imposto + 
                    COALESCE(NEW.chargebacks_reembolsos, 0) + 
                    COALESCE(NEW.ferramentas, 0) + 
                    NEW.gestor_trafego_valor + 
                    NEW.copywriter_valor;
    
    -- Atualizar campos calculados
    NEW.taxa_plataforma_valor := taxa_plataforma;
    NEW.imposto_valor := imposto;
    NEW.lucro_bruto := lucro_bruto;
    NEW.lucro_liquido := lucro_liquido;
    
    -- Calcular indicadores
    NEW.ticket_medio := CASE 
        WHEN NEW.numero_vendas > 0 THEN NEW.faturamento_bruto / NEW.numero_vendas 
        ELSE 0 
    END;
    
    NEW.cac := CASE 
        WHEN NEW.numero_vendas > 0 AND COALESCE(NEW.chargebacks_reembolsos, 0) > 0 
        THEN NEW.chargebacks_reembolsos / NEW.numero_vendas 
        ELSE 0 
    END;
    
    NEW.roi_percentual := CASE 
        WHEN total_custos > 0 THEN (lucro_liquido / total_custos) * 100 
        ELSE 0 
    END;
    
    NEW.chargeback_percentual := CASE 
        WHEN NEW.faturamento_bruto > 0 THEN (NEW.chargebacks_reembolsos / NEW.faturamento_bruto) * 100 
        ELSE 0 
    END;
    
    NEW.margem_contribuicao := CASE 
        WHEN NEW.faturamento_bruto > 0 THEN (lucro_bruto / NEW.faturamento_bruto) * 100 
        ELSE 0 
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;