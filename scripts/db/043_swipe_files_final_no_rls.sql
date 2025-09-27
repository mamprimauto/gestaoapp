-- SCRIPT FINAL - Swipe Files SEM RLS
-- Execute este script completo no Supabase SQL Editor

-- 1. Limpar tudo que existe antes
DROP TABLE IF EXISTS public.swipe_files CASCADE;

-- 2. Criar tabela nova
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

-- 3. Adicionar foreign key
ALTER TABLE public.swipe_files 
  ADD CONSTRAINT swipe_files_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 4. Criar índices para performance
CREATE INDEX idx_swipe_files_user ON public.swipe_files(user_id);
CREATE INDEX idx_swipe_files_niche ON public.swipe_files(niche);
CREATE INDEX idx_swipe_files_created_at ON public.swipe_files(created_at DESC);

-- 5. IMPORTANTE: RLS permanece DESABILITADO (padrão)
-- Não executar: ALTER TABLE public.swipe_files ENABLE ROW LEVEL SECURITY;

-- 6. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_swipe_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para chamar a função
CREATE TRIGGER update_swipe_files_updated_at
  BEFORE UPDATE ON public.swipe_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_files_updated_at();

-- 8. Inserir dados de exemplo para teste
INSERT INTO public.swipe_files (name, niche, ads_count, link, is_active) VALUES
  ('VSL Emagrecimento Pro', 'Emagrecimento', 234, 'https://drive.google.com/drive/folders/vsl-emagrecimento', true),
  ('Criativos ED Premium', 'Disfunção Erétil (ED)', 189, 'https://notion.so/ed-criativos-premium', true),
  ('Biblioteca Finanças Elite', 'Finanças', 567, 'https://airtable.com/financas-elite', true),
  ('Beleza & Skincare Ads', 'Beleza', 145, 'https://dropbox.com/beleza-skincare', true),
  ('Fitness Revolution Copies', 'Fitness', 298, 'https://mega.nz/fitness-revolution', true),
  ('Saúde Natural Swipes', 'Saúde', 412, 'https://onedrive.com/saude-natural', true),
  ('Marketing Digital Master', 'Marketing', 823, 'https://wetransfer.com/marketing-master', false),
  ('Relacionamento Gold', 'Relacionamento', 92, 'https://mediafire.com/relacionamento-gold', true),
  ('Tech Innovation Ads', 'Tecnologia', 176, 'https://box.com/tech-innovation', true),
  ('Educação Online Swipes', 'Educação', 201, 'https://pcloud.com/educacao-online', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Verificar se tudo funcionou
SELECT 
  'Tabela criada com sucesso!' as status,
  COUNT(*) as total_registros,
  'RLS Desabilitado' as rls_status
FROM public.swipe_files;