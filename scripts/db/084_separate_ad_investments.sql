-- Alterar tabela para separar investimentos em anúncios por plataforma
-- Substituir trafego_pago por três campos específicos

-- Adicionar novas colunas
ALTER TABLE internal_financial_data 
ADD COLUMN IF NOT EXISTS investimento_google_ads DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS investimento_facebook DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS investimento_tiktok DECIMAL(10,2) DEFAULT 0;

-- Migrar dados existentes (trafego_pago -> investimento_google_ads como padrão)
UPDATE internal_financial_data 
SET investimento_google_ads = COALESCE(trafego_pago, 0)
WHERE investimento_google_ads = 0;

-- Remover coluna antiga
ALTER TABLE internal_financial_data DROP COLUMN IF EXISTS trafego_pago;

-- Atualizar função de cálculo para considerar os três investimentos
CREATE OR REPLACE FUNCTION calculate_financial_indicators()
RETURNS TRIGGER AS $$
DECLARE
    total_investimento_ads DECIMAL(10,2);
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
    
    -- Calcular valores baseados em percentuais
    taxa_plataforma := NEW.faturamento_bruto * (NEW.taxa_plataforma_percentual / 100);
    imposto := NEW.faturamento_bruto * (NEW.imposto_percentual / 100);
    
    -- Calcular lucro bruto (receita - custos fixos - investimentos - taxa - imposto - chargebacks)
    lucro_bruto := NEW.faturamento_bruto - 
                   COALESCE(NEW.equipe_fixa, 0) - 
                   total_investimento_ads - 
                   taxa_plataforma - 
                   imposto - 
                   COALESCE(NEW.chargebacks_reembolsos, 0) - 
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
                    COALESCE(NEW.chargebacks_reembolsos, 0) + 
                    COALESCE(NEW.ferramentas, 0) + 
                    NEW.gestor_trafego_valor + 
                    NEW.copywriter_valor;
    
    -- Atualizar campos calculados
    NEW.taxa_plataforma_valor := taxa_plataforma;
    NEW.imposto_valor := imposto;
    NEW.lucro_bruto := lucro_bruto;
    NEW.lucro_liquido := lucro_liquido;
    NEW.total_investimento_ads := total_investimento_ads;
    
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