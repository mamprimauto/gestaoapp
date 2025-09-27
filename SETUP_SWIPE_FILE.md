# Setup Swipe File - Instruções

## Para fazer funcionar o Swipe File no Supabase:

### 1. Acesse o Supabase Dashboard
https://supabase.com/dashboard

### 2. Vá para SQL Editor

### 3. Cole e execute este código SQL (SEM RLS):

```sql
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

-- NÃO HABILITAR RLS - Deixar desabilitado para evitar erros
-- ALTER TABLE public.swipe_files DISABLE ROW LEVEL SECURITY;

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

-- Inserir dados de exemplo (opcional)
INSERT INTO public.swipe_files (name, niche, ads_count, link, is_active) VALUES
  ('VSL Emagrecimento Pro', 'Emagrecimento', 234, 'https://drive.google.com/drive/folders/vsl-emagrecimento', true),
  ('Criativos ED Premium', 'Disfunção Erétil (ED)', 189, 'https://notion.so/ed-criativos-premium', true),
  ('Biblioteca Finanças Elite', 'Finanças', 567, 'https://airtable.com/financas-elite', true),
  ('Beleza & Skincare Ads', 'Beleza', 145, 'https://dropbox.com/beleza-skincare', true),
  ('Fitness Revolution Copies', 'Fitness', 298, 'https://mega.nz/fitness-revolution', true)
ON CONFLICT (id) DO NOTHING;
```

### 4. Clique em "Run" para executar

### 5. Pronto! Agora você pode usar a página Swipe File

## Verificar se funcionou:

1. Acesse `/swipe-file` no seu app
2. Clique em "Nova Biblioteca"
3. Preencha os campos e salve
4. Se aparecer erro, verifique o console do navegador (F12)

## Troubleshooting:

- **Erro "Tabela não existe"**: Execute o SQL acima no Supabase
- **Erro de permissão**: Verifique se você está logado
- **Erro ao criar**: Verifique se todos os campos obrigatórios estão preenchidos