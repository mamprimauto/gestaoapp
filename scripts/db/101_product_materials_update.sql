-- Adicionar colunas faltantes na tabela product_materials
ALTER TABLE public.product_materials
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Adicionar comentários
COMMENT ON COLUMN public.product_materials.file_path IS 'Caminho do arquivo no storage para operações futuras';
COMMENT ON COLUMN public.product_materials.created_by IS 'ID do usuário que fez o upload do material';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_product_materials_created_by ON public.product_materials(created_by);
CREATE INDEX IF NOT EXISTS idx_product_materials_product_id ON public.product_materials(product_id);