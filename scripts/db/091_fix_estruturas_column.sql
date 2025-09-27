-- Fix column name mismatch in estruturas_invisiveis table
-- Rename conteudo_raw to conteudo to match the intended schema

-- Check if the table exists and has the conteudo_raw column
DO $$
BEGIN
    -- Only rename if conteudo_raw column exists and conteudo doesn't
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'estruturas_invisiveis' 
        AND column_name = 'conteudo_raw'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'estruturas_invisiveis' 
        AND column_name = 'conteudo'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.estruturas_invisiveis 
        RENAME COLUMN conteudo_raw TO conteudo;
        
        RAISE NOTICE 'Column conteudo_raw renamed to conteudo';
    ELSE
        RAISE NOTICE 'Column rename not needed - conteudo column already exists or conteudo_raw does not exist';
    END IF;
END $$;

-- Update column comment to match the new name
COMMENT ON COLUMN public.estruturas_invisiveis.conteudo IS 'Texto completo da análise';