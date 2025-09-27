-- Migration: Add file_category column to task_files table
-- This enables proper categorization of files into 'avatar', 'inspiration', or 'general'

-- Add the file_category column
ALTER TABLE public.task_files 
ADD COLUMN IF NOT EXISTS file_category TEXT DEFAULT 'general';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS task_files_category_idx ON public.task_files(task_id, file_category);

-- Add documentation comment
COMMENT ON COLUMN public.task_files.file_category IS 'Categoria do arquivo: general (padrão), avatar (imagens de perfil/avatar), inspiration (imagens de inspiração), entregavel (arquivos finais prontos para entrega)';

-- Update existing files to have 'general' category if null
UPDATE public.task_files 
SET file_category = 'general' 
WHERE file_category IS NULL;