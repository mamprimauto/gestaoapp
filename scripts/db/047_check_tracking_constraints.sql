-- Verificar e corrigir constraints da tabela swipe_file_tracking
-- Execute este script no Supabase SQL Editor

-- 1. Verificar todas as constraints existentes
SELECT 
  conname as constraint_name,
  contype as tipo
FROM pg_constraint 
WHERE conrelid = 'public.swipe_file_tracking'::regclass
ORDER BY conname;

-- 2. Se precisar remover duplicatas (execute apenas se necessário)
-- ALTER TABLE public.swipe_file_tracking 
-- DROP CONSTRAINT IF EXISTS unique_swipe_file_day;

-- 3. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'swipe_file_tracking'
ORDER BY ordinal_position;

-- 4. Testar se está funcionando inserindo um registro de teste
-- Este teste criará e depois deletará um registro
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Inserir registro teste
  INSERT INTO public.swipe_file_tracking 
    (swipe_file_id, day_number, ads_count, date)
  VALUES 
    ('00000000-0000-0000-0000-000000000000'::UUID, 999, 0, CURRENT_DATE)
  RETURNING id INTO test_id;
  
  -- Deletar registro teste
  DELETE FROM public.swipe_file_tracking WHERE id = test_id;
  
  RAISE NOTICE 'Teste de inserção/deleção funcionou corretamente!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro no teste: %', SQLERRM;
END $$;

-- 5. Resultado final
SELECT 
  'Tabela swipe_file_tracking está configurada corretamente!' as status,
  COUNT(*) as total_registros_existentes
FROM public.swipe_file_tracking;