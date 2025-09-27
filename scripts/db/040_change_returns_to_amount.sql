-- Alterar campo return_percentage para return_amount
-- Mudar de porcentagem para valor absoluto em reais

ALTER TABLE financial_data 
RENAME COLUMN return_percentage TO return_amount;

ALTER TABLE financial_data 
ALTER COLUMN return_amount TYPE DECIMAL(15,2);

COMMENT ON COLUMN financial_data.return_amount IS 'devoluções em reais';