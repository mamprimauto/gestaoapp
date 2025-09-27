# Migração de Banco Necessária

O sistema financeiro interno foi atualizado, mas requer migração do banco de dados.

## Problema Atual
A função trigger no banco ainda referencia campos antigos que foram removidos.

## Solução
Execute as seguintes queries SQL no console do Supabase:

```sql
-- 1. Adicionar colunas separadas para investimentos
ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_google_ads DECIMAL(10,2) DEFAULT 0;
ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_facebook DECIMAL(10,2) DEFAULT 0;
ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_tiktok DECIMAL(10,2) DEFAULT 0;

-- 2. Adicionar colunas separadas para chargebacks e reembolsos  
ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS chargebacks DECIMAL(10,2) DEFAULT 0;
ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS reembolsos DECIMAL(10,2) DEFAULT 0;

-- 3. Atualizar função trigger (copie do arquivo apply-migrations.sql)
```

Após executar essas queries, o sistema funcionará corretamente com os campos separados.