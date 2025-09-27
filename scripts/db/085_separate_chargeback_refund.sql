-- Separar chargebacks e reembolsos em campos distintos
-- Adicionar colunas separadas para chargeback e reembolso

-- Adicionar novas colunas
ALTER TABLE internal_financial_data 
ADD COLUMN IF NOT EXISTS chargebacks DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reembolsos DECIMAL(10,2) DEFAULT 0;

-- Migrar dados existentes (dividir chargebacks_reembolsos igualmente entre os dois campos)
UPDATE internal_financial_data 
SET chargebacks = COALESCE(chargebacks_reembolsos, 0) / 2,
    reembolsos = COALESCE(chargebacks_reembolsos, 0) / 2
WHERE chargebacks = 0 AND reembolsos = 0;

-- Manter a coluna antiga por compatibilidade (será removida em migration futura)
-- ALTER TABLE internal_financial_data DROP COLUMN IF EXISTS chargebacks_reembolsos;

-- Atualizar função de cálculo para usar os campos separados
CREATE OR REPLACE FUNCTION calculate_financial_indicators()
RETURNS TRIGGER AS $$
DECLARE
    total_investimento_ads DECIMAL(10,2);
    total_chargebacks_reembolsos DECIMAL(10,2);
    taxa_plataforma DECIMAL(10,2);
    imposto DECIMAL(10,2);
    lucro_bruto DECIMAL(10,2);
    lucro_liquido DECIMAL(10,2);
    total_custos DECIMAL(10,2);
BEGIN
    -- Calcular total de investimento em anúncios
    total_investimento_ads := COALESCE(NEW.investimento_google_ads, 0) + 
                             COALESCE(NEW.investimento_facebook, 0) + 
                             COALESCE(NEW.investimento_tiktok, 0);
    
    -- Calcular total de chargebacks + reembolsos
    total_chargebacks_reembolsos := COALESCE(NEW.chargebacks, 0) + COALESCE(NEW.reembolsos, 0);
    
    -- Calcular valores baseados em percentuais
    taxa_plataforma := NEW.faturamento_bruto * (NEW.taxa_plataforma_percentual / 100);
    imposto := NEW.faturamento_bruto * (NEW.imposto_percentual / 100);
    
    -- Calcular lucro bruto (receita - custos fixos - investimentos - taxa - imposto - chargebacks/reembolsos)
    lucro_bruto := NEW.faturamento_bruto - 
                   COALESCE(NEW.equipe_fixa, 0) - 
                   total_investimento_ads - 
                   taxa_plataforma - 
                   imposto - 
                   total_chargebacks_reembolsos - 
                   COALESCE(NEW.ferramentas, 0);
    
    -- Calcular comissões baseadas no lucro bruto
    NEW.gestor_trafego_valor := lucro_bruto * (NEW.gestor_trafego_percentual / 100);
    NEW.copywriter_valor := lucro_bruto * (NEW.copywriter_percentual / 100);
    
    -- Calcular lucro líquido
    lucro_liquido := lucro_bruto - NEW.gestor_trafego_valor - NEW.copywriter_valor;
    
    -- Calcular total de custos
    total_custos := COALESCE(NEW.equipe_fixa, 0) + 
                    total_investimento_ads + 
                    taxa_plataforma + 
                    imposto + 
                    total_chargebacks_reembolsos + 
                    COALESCE(NEW.ferramentas, 0) + 
                    NEW.gestor_trafego_valor + 
                    NEW.copywriter_valor;
    
    -- Atualizar campos calculados
    NEW.taxa_plataforma_valor := taxa_plataforma;
    NEW.imposto_valor := imposto;
    NEW.lucro_bruto := lucro_bruto;
    NEW.lucro_liquido := lucro_liquido;
    NEW.total_investimento_ads := total_investimento_ads;
    
    -- Manter compatibilidade com campo antigo
    NEW.chargebacks_reembolsos := total_chargebacks_reembolsos;
    
    -- Calcular indicadores
    NEW.ticket_medio := CASE 
        WHEN NEW.numero_vendas > 0 THEN NEW.faturamento_bruto / NEW.numero_vendas 
        ELSE 0 
    END;
    
    NEW.cac := CASE 
        WHEN NEW.numero_vendas > 0 THEN total_investimento_ads / NEW.numero_vendas 
        ELSE 0 
    END;
    
    NEW.roi_percentual := CASE 
        WHEN total_custos > 0 THEN (lucro_liquido / total_custos) * 100 
        ELSE 0 
    END;
    
    NEW.chargeback_percentual := CASE 
        WHEN NEW.faturamento_bruto > 0 THEN (total_chargebacks_reembolsos / NEW.faturamento_bruto) * 100 
        ELSE 0 
    END;
    
    NEW.margem_contribuicao := CASE 
        WHEN NEW.faturamento_bruto > 0 THEN (lucro_bruto / NEW.faturamento_bruto) * 100 
        ELSE 0 
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;