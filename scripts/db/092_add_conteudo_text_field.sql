-- Add conteudo_text field to estruturas_invisiveis for plain text search
-- This will store the plain text version of the Quill delta content

ALTER TABLE public.estruturas_invisiveis 
ADD COLUMN IF NOT EXISTS conteudo_text TEXT;

-- Create index for text search performance
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_conteudo_text 
ON public.estruturas_invisiveis USING GIN (to_tsvector('portuguese', conteudo_text));

-- Update existing records to populate conteudo_text from conteudo
-- This handles backwards compatibility for existing plain text content
UPDATE public.estruturas_invisiveis 
SET conteudo_text = conteudo 
WHERE conteudo_text IS NULL AND conteudo IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.estruturas_invisiveis.conteudo_text IS 'Plain text version of content for search and display';