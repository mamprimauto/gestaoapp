-- Criar tabela para gerenciar nichos personalizados
-- Execute este script no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.swipe_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_swipe_niches_user ON public.swipe_niches(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_niches_active ON public.swipe_niches(is_active);

-- NÃO habilitar RLS (mantendo consistente)

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_niches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_swipe_niches_updated_at ON public.swipe_niches;
CREATE TRIGGER update_swipe_niches_updated_at
  BEFORE UPDATE ON public.swipe_niches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_niches_updated_at();

-- Inserir nichos padrão
INSERT INTO public.swipe_niches (name, color) VALUES
  ('Disfunção Erétil (ED)', 'blue'),
  ('Emagrecimento', 'green'),
  ('Finanças', 'yellow'),
  ('Beleza', 'pink'),
  ('Saúde', 'red'),
  ('Fitness', 'orange'),
  ('Relacionamento', 'purple'),
  ('Educação', 'indigo'),
  ('Tecnologia', 'cyan'),
  ('Marketing', 'emerald'),
  ('Outros', 'gray')
ON CONFLICT (name) DO NOTHING;

-- Verificar
SELECT 
  'Nichos criados!' as status,
  COUNT(*) as total_nichos
FROM public.swipe_niches;