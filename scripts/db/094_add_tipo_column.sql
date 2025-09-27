-- Add tipo column to estruturas_invisiveis table
-- This will store the type of structure: VSL, Criativo, or Lead

-- Add tipo column with default value
ALTER TABLE public.estruturas_invisiveis 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'VSL' CHECK (tipo IN ('VSL', 'Criativo', 'Lead'));

-- Create index for filtering by tipo
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_tipo 
ON public.estruturas_invisiveis (tipo);

-- Update existing records to have default tipo
UPDATE public.estruturas_invisiveis 
SET tipo = 'VSL' 
WHERE tipo IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.estruturas_invisiveis.tipo IS 'Type of invisible structure: VSL, Criativo, or Lead';