-- Criar tabela para armazenar bibliotecas de anúncios (swipe files)
CREATE TABLE IF NOT EXISTS public.swipe_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  ads_count INTEGER DEFAULT 0,
  link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_swipe_files_organization ON public.swipe_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_swipe_files_niche ON public.swipe_files(niche);
CREATE INDEX IF NOT EXISTS idx_swipe_files_created_at ON public.swipe_files(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.swipe_files ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver swipe files da sua organização
CREATE POLICY "Users can view swipe files from their organization"
  ON public.swipe_files
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem criar swipe files para sua organização
CREATE POLICY "Users can create swipe files for their organization"
  ON public.swipe_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar swipe files da sua organização
CREATE POLICY "Users can update swipe files from their organization"
  ON public.swipe_files
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem deletar swipe files da sua organização
CREATE POLICY "Users can delete swipe files from their organization"
  ON public.swipe_files
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

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