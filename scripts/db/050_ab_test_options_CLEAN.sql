-- Migracao: Sistema de configuracoes para opcoes de testes A/B
-- Permite editar/adicionar/excluir tipos de teste e canais
-- VERSAO LIMPA - Sem acentos

-- Tabela para armazenar opcoes configuraveis
CREATE TABLE IF NOT EXISTS public.ab_test_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS ab_test_options_type_idx ON public.ab_test_options(option_type);
CREATE INDEX IF NOT EXISTS ab_test_options_active_idx ON public.ab_test_options(is_active);
CREATE INDEX IF NOT EXISTS ab_test_options_sort_idx ON public.ab_test_options(option_type, sort_order);

-- Constraint para evitar duplicatas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ab_test_options_type_value_unique' 
    AND table_name = 'ab_test_options'
  ) THEN
    ALTER TABLE public.ab_test_options 
    ADD CONSTRAINT ab_test_options_type_value_unique 
    UNIQUE (option_type, value);
  END IF;
END $$;

-- RLS Sistema colaborativo
ALTER TABLE public.ab_test_options ENABLE ROW LEVEL SECURITY;

-- Politicas de acesso
DROP POLICY IF EXISTS "ab_test_options_select_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_select_policy"
ON public.ab_test_options FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ab_test_options_insert_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_insert_policy"
ON public.ab_test_options FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ab_test_options_update_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_update_policy"
ON public.ab_test_options FOR UPDATE
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ab_test_options_delete_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_delete_policy"
ON public.ab_test_options FOR DELETE
USING (auth.role() = 'authenticated');

-- Funcao e trigger para updated_at
CREATE OR REPLACE FUNCTION public.ab_test_options_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ab_test_options_set_updated_at ON public.ab_test_options;
CREATE TRIGGER trg_ab_test_options_set_updated_at
  BEFORE UPDATE ON public.ab_test_options
  FOR EACH ROW EXECUTE PROCEDURE public.ab_test_options_set_updated_at();

-- Inserir dados iniciais
INSERT INTO public.ab_test_options (option_type, value, label, sort_order) VALUES
('test_type', 'VSL', 'VSL', 1),
('test_type', 'Headline', 'Headline', 2),
('test_type', 'CTA', 'CTA', 3),
('test_type', 'Landing Page', 'Landing Page', 4),
('test_type', 'Creative', 'Creative', 5),
('test_type', 'Email', 'Email', 6),
('test_type', 'Ad Copy', 'Ad Copy', 7),
('channel', 'Facebook Ads', 'Facebook Ads', 1),
('channel', 'YouTube', 'YouTube', 2),
('channel', 'Google Ads', 'Google Ads', 3),
('channel', 'TikTok', 'TikTok', 4),
('channel', 'Instagram', 'Instagram', 5),
('channel', 'Email', 'Email', 6),
('channel', 'Organic', 'Organico', 7)
ON CONFLICT (option_type, value) DO NOTHING;

-- Verificacao final
SELECT 'Tabela ab_test_options criada com sucesso!' as resultado;
SELECT COUNT(*) as total_opcoes FROM ab_test_options;