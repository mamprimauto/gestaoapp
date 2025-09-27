-- Sistema de rastreamento de resultados para Swipe Files
-- Execute este script no Supabase SQL Editor

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

-- Constraint única para evitar duplicação de dias para a mesma biblioteca
ALTER TABLE public.swipe_file_tracking 
  ADD CONSTRAINT unique_swipe_file_day 
  UNIQUE (swipe_file_id, day_number);

-- NÃO habilitar RLS (mantendo consistente com swipe_files)
-- ALTER TABLE public.swipe_file_tracking ENABLE ROW LEVEL SECURITY;

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

-- Adicionar coluna na tabela swipe_files para indicar se está sendo rastreada
ALTER TABLE public.swipe_files 
  ADD COLUMN IF NOT EXISTS is_tracking BOOLEAN DEFAULT false;

-- Verificar se tudo foi criado corretamente
SELECT 
  'Tabela de rastreamento criada!' as status,
  COUNT(*) as colunas_criadas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'swipe_file_tracking';