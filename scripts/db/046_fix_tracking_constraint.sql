-- Corrigir constraint única para a tabela swipe_file_tracking
-- Execute este script no Supabase SQL Editor

-- Primeiro, remover constraint antiga se existir
ALTER TABLE public.swipe_file_tracking 
DROP CONSTRAINT IF EXISTS unique_swipe_file_day;

-- Recriar constraint com o nome correto
ALTER TABLE public.swipe_file_tracking 
ADD CONSTRAINT swipe_file_tracking_swipe_file_id_day_number_key 
UNIQUE (swipe_file_id, day_number);

-- Verificar se a constraint foi criada
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.swipe_file_tracking'::regclass;

-- Testar se a tabela está funcionando
SELECT 
  'Constraint corrigida!' as status,
  COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'swipe_file_tracking';