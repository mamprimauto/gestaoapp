# Setup do Sistema de Rastreamento - Swipe Files

## ⚠️ IMPORTANTE: Execute PRIMEIRO este comando para adicionar a coluna is_tracking:

```sql
-- EXECUTE ISTO PRIMEIRO!
ALTER TABLE public.swipe_files 
ADD COLUMN IF NOT EXISTS is_tracking BOOLEAN DEFAULT false;
```

## Para ativar o rastreamento no Supabase:

### 1. Acesse o Supabase Dashboard
https://supabase.com/dashboard

### 2. Vá para SQL Editor

### 3. Execute este código SQL:

```sql
-- Sistema de rastreamento de resultados para Swipe Files

-- Criar tabela para armazenar rastreamento de resultados
CREATE TABLE IF NOT EXISTS public.swipe_file_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swipe_file_id UUID NOT NULL REFERENCES public.swipe_files(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  ads_count INTEGER DEFAULT 0,
  date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_swipe_tracking_file ON public.swipe_file_tracking(swipe_file_id);
CREATE INDEX IF NOT EXISTS idx_swipe_tracking_day ON public.swipe_file_tracking(day_number);
CREATE INDEX IF NOT EXISTS idx_swipe_tracking_date ON public.swipe_file_tracking(date);
CREATE INDEX IF NOT EXISTS idx_swipe_tracking_user ON public.swipe_file_tracking(user_id);

-- Constraint única para evitar duplicação
ALTER TABLE public.swipe_file_tracking 
  ADD CONSTRAINT unique_swipe_file_day 
  UNIQUE (swipe_file_id, day_number);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_swipe_tracking_updated_at ON public.swipe_file_tracking;
CREATE TRIGGER update_swipe_tracking_updated_at
  BEFORE UPDATE ON public.swipe_file_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_tracking_updated_at();

-- Adicionar coluna is_tracking na tabela swipe_files
ALTER TABLE public.swipe_files 
  ADD COLUMN IF NOT EXISTS is_tracking BOOLEAN DEFAULT false;

-- Verificar se funcionou
SELECT 
  'Sistema de rastreamento criado!' as status,
  COUNT(*) as colunas_criadas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'swipe_file_tracking';
```

### 4. Clique em "Run" para executar

### 5. Pronto! O sistema de rastreamento está ativo

## Como usar:

1. **Iniciar Rastreamento:**
   - Na lista de bibliotecas, clique no botão "Rastrear"
   - O botão mudará para "Resultados"

2. **Adicionar Resultados:**
   - Clique no botão "Resultados"
   - Preencha a quantidade de anúncios para cada dia
   - Clique em "+ Adicionar Dia" para adicionar mais dias
   - Clique em "Salvar Rastreamento"

3. **Visualizar Resultados:**
   - Clique em "Resultados" a qualquer momento
   - Veja o total de anúncios e média diária
   - Edite os valores conforme necessário

## Funcionalidades:

- ✅ Rastreamento por dias
- ✅ Adicionar dias ilimitados
- ✅ Total e média automáticos
- ✅ Persistência no banco de dados
- ✅ Interface intuitiva

## Troubleshooting:

**Erro ao clicar em Rastrear:**
- Execute o SQL acima no Supabase
- Verifique se a coluna `is_tracking` foi adicionada

**Modal não abre:**
- Recarregue a página (F5)
- Verifique o console do navegador (F12)

**Dados não salvam:**
- Verifique se a tabela `swipe_file_tracking` existe
- Execute o SQL completo novamente