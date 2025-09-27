-- Remove RLS policies from product_materials for local development

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view product materials" ON public.product_materials;
DROP POLICY IF EXISTS "Authenticated users can create materials" ON public.product_materials;
DROP POLICY IF EXISTS "Users can update their own materials" ON public.product_materials;
DROP POLICY IF EXISTS "Users can delete their own materials" ON public.product_materials;

-- Disable RLS completely for local development
ALTER TABLE public.product_materials DISABLE ROW LEVEL SECURITY;

-- Make created_by nullable since we're removing auth requirements
ALTER TABLE public.product_materials ALTER COLUMN created_by DROP NOT NULL;