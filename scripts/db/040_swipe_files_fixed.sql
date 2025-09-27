-- Script corrigido para criar tabela swipe_files
-- Execute este script no Supabase SQL Editor

-- Primeiro, remover tabela se existir (para limpar qualquer erro anterior)
DROP TABLE IF EXISTS public.swipe_files CASCADE;

-- Criar tabela para armazenar bibliotecas de anúncios
CREATE TABLE public.swipe_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  ads_count INTEGER DEFAULT 0,
  link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- Adicionar foreign key após criar a tabela
ALTER TABLE public.swipe_files 
  ADD CONSTRAINT swipe_files_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Índices para melhor performance
CREATE INDEX idx_swipe_files_user ON public.swipe_files(user_id);
CREATE INDEX idx_swipe_files_niche ON public.swipe_files(niche);
CREATE INDEX idx_swipe_files_created_at ON public.swipe_files(created_at DESC);

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
  WITH CHECK (true);

-- Política: Usuários podem atualizar qualquer biblioteca (temporário para teste)
CREATE POLICY "Users can update swipe files"
  ON public.swipe_files
  FOR UPDATE
  TO authenticated
  USING (true);

-- Política: Usuários podem deletar qualquer biblioteca (temporário para teste)
CREATE POLICY "Users can delete swipe files"
  ON public.swipe_files
  FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_swipe_files_updated_at
  BEFORE UPDATE ON public.swipe_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_files_updated_at();