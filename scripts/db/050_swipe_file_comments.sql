-- Sistema de comentários para Swipe Files
-- Execute este script no Supabase SQL Editor

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS public.swipe_file_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swipe_file_id UUID NOT NULL REFERENCES public.swipe_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_swipe_comments_file ON public.swipe_file_comments(swipe_file_id);
CREATE INDEX IF NOT EXISTS idx_swipe_comments_user ON public.swipe_file_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_comments_created ON public.swipe_file_comments(created_at DESC);

-- NÃO habilitar RLS (mantendo consistente com swipe_files)

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_swipe_comments_updated_at ON public.swipe_file_comments;
CREATE TRIGGER update_swipe_comments_updated_at
  BEFORE UPDATE ON public.swipe_file_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_comments_updated_at();

-- Criar bucket no Storage para imagens (execute no Dashboard do Supabase)
-- 1. Vá para Storage no Dashboard
-- 2. Crie um novo bucket chamado "swipe-file-comments"
-- 3. Marque como público

-- Verificar se funcionou
SELECT 
  'Tabela de comentários criada!' as status,
  COUNT(*) as colunas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'swipe_file_comments';