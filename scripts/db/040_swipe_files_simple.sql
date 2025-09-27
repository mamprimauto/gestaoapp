-- Versão simplificada da tabela swipe_files (sem organization_id)
-- Execute este script no Supabase SQL Editor

-- Criar tabela para armazenar bibliotecas de anúncios
CREATE TABLE IF NOT EXISTS public.swipe_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  ads_count INTEGER DEFAULT 0,
  link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_swipe_files_user ON public.swipe_files(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_files_niche ON public.swipe_files(niche);
CREATE INDEX IF NOT EXISTS idx_swipe_files_created_at ON public.swipe_files(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.swipe_files ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todas as bibliotecas
CREATE POLICY "Users can view all swipe files"
  ON public.swipe_files
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuários podem criar suas próprias bibliotecas
CREATE POLICY "Users can create swipe files"
  ON public.swipe_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Política: Usuários podem atualizar suas próprias bibliotecas
CREATE POLICY "Users can update their swipe files"
  ON public.swipe_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Política: Usuários podem deletar suas próprias bibliotecas
CREATE POLICY "Users can delete their swipe files"
  ON public.swipe_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_swipe_files_updated_at ON public.swipe_files;
CREATE TRIGGER update_swipe_files_updated_at
  BEFORE UPDATE ON public.swipe_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_files_updated_at();