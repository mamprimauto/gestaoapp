-- Migração: Sistema de configurações para opções de testes A/B
-- Permite editar/adicionar/excluir tipos de teste e canais

-- Tabela para armazenar opções configuráveis
CREATE TABLE IF NOT EXISTS public.ab_test_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type TEXT NOT NULL, -- 'test_type' ou 'channel'
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS ab_test_options_type_idx ON public.ab_test_options(option_type);
CREATE INDEX IF NOT EXISTS ab_test_options_active_idx ON public.ab_test_options(is_active);
CREATE INDEX IF NOT EXISTS ab_test_options_sort_idx ON public.ab_test_options(option_type, sort_order);

-- Constraint para evitar duplicatas (tipo + valor único)
ALTER TABLE public.ab_test_options 
ADD CONSTRAINT ab_test_options_type_value_unique 
UNIQUE (option_type, value);

-- RLS (Row Level Security) - Sistema colaborativo
ALTER TABLE public.ab_test_options ENABLE ROW LEVEL SECURITY;

-- Política de visualização: todos autenticados podem ver
DROP POLICY IF EXISTS "ab_test_options_select_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_select_policy"
ON public.ab_test_options FOR SELECT
USING (auth.role() = 'authenticated');

-- Política de inserção: todos autenticados podem criar
DROP POLICY IF EXISTS "ab_test_options_insert_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_insert_policy"
ON public.ab_test_options FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Política de atualização: todos autenticados podem atualizar
DROP POLICY IF EXISTS "ab_test_options_update_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_update_policy"
ON public.ab_test_options FOR UPDATE
USING (auth.role() = 'authenticated');

-- Política de exclusão: todos autenticados podem excluir
DROP POLICY IF EXISTS "ab_test_options_delete_policy" ON public.ab_test_options;
CREATE POLICY "ab_test_options_delete_policy"
ON public.ab_test_options FOR DELETE
USING (auth.role() = 'authenticated');

-- Função e trigger para updated_at
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

-- Inserir dados iniciais (opções atuais do sistema)
INSERT INTO public.ab_test_options (option_type, value, label, sort_order) VALUES
-- Tipos de Teste
('test_type', 'VSL', 'VSL', 1),
('test_type', 'Headline', 'Headline', 2),
('test_type', 'CTA', 'CTA', 3),
('test_type', 'Landing Page', 'Landing Page', 4),
('test_type', 'Creative', 'Creative', 5),
('test_type', 'Email', 'Email', 6),
('test_type', 'Ad Copy', 'Ad Copy', 7),

-- Canais
('channel', 'Facebook Ads', 'Facebook Ads', 1),
('channel', 'YouTube', 'YouTube', 2),
('channel', 'Google Ads', 'Google Ads', 3),
('channel', 'TikTok', 'TikTok', 4),
('channel', 'Instagram', 'Instagram', 5),
('channel', 'Email', 'Email', 6),
('channel', 'Organic', 'Orgânico', 7)

ON CONFLICT (option_type, value) DO NOTHING;

-- Comentários da tabela
COMMENT ON TABLE public.ab_test_options IS 'Opções configuráveis para tipos de teste e canais dos testes A/B';
COMMENT ON COLUMN public.ab_test_options.option_type IS 'Tipo da opção: test_type ou channel';
COMMENT ON COLUMN public.ab_test_options.value IS 'Valor usado internamente no sistema';
COMMENT ON COLUMN public.ab_test_options.label IS 'Rótulo exibido na interface';
COMMENT ON COLUMN public.ab_test_options.is_active IS 'Se a opção está ativa e disponível';
COMMENT ON COLUMN public.ab_test_options.sort_order IS 'Ordem de exibição nas listas';

-- Verificação final
SELECT 'Tabela ab_test_options criada com sucesso!' as resultado;
SELECT COUNT(*) as total_opcoes FROM ab_test_options;