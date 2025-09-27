-- Sample data for swipe_files table
-- Execute this after creating the table to populate with example data

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