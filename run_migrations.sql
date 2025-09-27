-- Run all necessary migrations for estruturas_invisiveis

-- 1. Create the table
-- Criar tabela de estruturas invisíveis (versão minimalista)
CREATE TABLE IF NOT EXISTS public.estruturas_invisiveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  anotacoes JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.estruturas_invisiveis ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam e gerenciem apenas suas próprias estruturas
DROP POLICY IF EXISTS "Users can manage their own estruturas_invisiveis" ON public.estruturas_invisiveis;
CREATE POLICY "Users can manage their own estruturas_invisiveis" ON public.estruturas_invisiveis
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_user_id ON public.estruturas_invisiveis(user_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_created_at ON public.estruturas_invisiveis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_titulo ON public.estruturas_invisiveis(titulo);

-- 2. Add conteudo_text field for search
ALTER TABLE public.estruturas_invisiveis 
ADD COLUMN IF NOT EXISTS conteudo_text TEXT;

-- Create index for text search performance
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_conteudo_text 
ON public.estruturas_invisiveis USING GIN (to_tsvector('portuguese', conteudo_text));

-- Update existing records to populate conteudo_text from conteudo
UPDATE public.estruturas_invisiveis 
SET conteudo_text = conteudo 
WHERE conteudo_text IS NULL AND conteudo IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.estruturas_invisiveis IS 'Tabela para armazenar análises de estruturas invisíveis com anotações usando Quill editor';
COMMENT ON COLUMN public.estruturas_invisiveis.titulo IS 'Título da análise';
COMMENT ON COLUMN public.estruturas_invisiveis.conteudo IS 'Conteúdo em formato Quill Delta (JSON)';
COMMENT ON COLUMN public.estruturas_invisiveis.conteudo_text IS 'Versão texto plano do conteúdo para busca';
COMMENT ON COLUMN public.estruturas_invisiveis.anotacoes IS 'Array de anotações do Quill editor';