-- Adicionar coluna is_tracking na tabela swipe_files
-- Execute este script no Supabase SQL Editor para corrigir o erro

-- Adicionar coluna se não existir
ALTER TABLE public.swipe_files 
ADD COLUMN IF NOT EXISTS is_tracking BOOLEAN DEFAULT false;

-- Verificar se a coluna foi adicionada
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'swipe_files'
  AND column_name = 'is_tracking';

-- Atualizar todos os registros existentes para false (não rastreando)
UPDATE public.swipe_files 
SET is_tracking = false 
WHERE is_tracking IS NULL;

-- Verificar o resultado
SELECT 
  'Coluna is_tracking adicionada com sucesso!' as status,
  COUNT(*) as total_bibliotecas,
  SUM(CASE WHEN is_tracking = true THEN 1 ELSE 0 END) as rastreando,
  SUM(CASE WHEN is_tracking = false THEN 1 ELSE 0 END) as nao_rastreando
FROM public.swipe_files;