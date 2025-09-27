-- Script para desabilitar RLS na tabela swipe_files
-- Execute este script no Supabase SQL Editor para resolver o erro de RLS

-- Primeiro, remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view all swipe files" ON public.swipe_files;
DROP POLICY IF EXISTS "Users can create swipe files" ON public.swipe_files;
DROP POLICY IF EXISTS "Users can update swipe files" ON public.swipe_files;
DROP POLICY IF EXISTS "Users can delete swipe files" ON public.swipe_files;
DROP POLICY IF EXISTS "Users can update their swipe files" ON public.swipe_files;
DROP POLICY IF EXISTS "Users can delete their swipe files" ON public.swipe_files;

-- Desabilitar RLS completamente
ALTER TABLE public.swipe_files DISABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi desabilitado
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'swipe_files';

-- Agora você pode inserir os dados de exemplo sem problemas de RLS
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

-- Verificar se os dados foram inseridos
SELECT COUNT(*) as total_bibliotecas FROM public.swipe_files;