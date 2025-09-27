# 🚨 SOLUÇÃO IMEDIATA - Desabilitar Trigger

## Problema
O trigger ainda referencia campos antigos. Vamos desabilitá-lo temporariamente.

## Execute no SQL Editor do Supabase:

```sql
-- 1. Desabilitar o trigger problemático
DROP TRIGGER IF EXISTS calculate_financial_indicators_trigger ON internal_financial_data;

-- 2. Opcional: Verificar se existem outros triggers
-- SELECT * FROM information_schema.triggers WHERE event_object_table = 'internal_financial_data';
```

Isso permitirá que o sistema funcione imediatamente sem cálculos automáticos (que adicionaremos depois).