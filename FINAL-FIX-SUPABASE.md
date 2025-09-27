# 🚨 CORREÇÃO FINAL - Supabase Dashboard

## PASSO A PASSO DETALHADO

### 1. Acesse o Supabase Dashboard
- Vá para: https://dashboard.supabase.com
- Faça login na sua conta
- Selecione o projeto do gestaoapp

### 2. Navegue para SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Clique em **"New query"** ou use uma query existente

### 3. Cole EXATAMENTE este código:

```sql
-- Verificar triggers existentes
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'internal_financial_data';

-- Remover TODOS os triggers da tabela
DROP TRIGGER IF EXISTS calculate_financial_indicators_trigger ON internal_financial_data;
DROP TRIGGER IF EXISTS financial_trigger ON internal_financial_data;
DROP TRIGGER IF EXISTS auto_calculate_trigger ON internal_financial_data;

-- Verificar novamente (deve retornar vazio)
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'internal_financial_data';
```

### 4. Execute a Query
- Clique no botão **"Run"** (ou Ctrl/Cmd + Enter)
- Aguarde a execução completar

### 5. Resultado Esperado
- Primeira consulta: mostra triggers existentes
- Comandos DROP: removem os triggers
- Segunda consulta: deve retornar VAZIO (sem triggers)

## ✅ APÓS EXECUTAR
O sistema funcionará imediatamente sem erros!