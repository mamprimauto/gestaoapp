-- Product Materials Table for storing gallery materials (banners, videos, gifs, etc.)

CREATE TABLE IF NOT EXISTS public.product_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL, -- references products (criativos/leads/vsl)
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- image, video, gif, etc.
  file_size INTEGER, -- in bytes
  thumbnail_url TEXT, -- for video thumbnails
  category TEXT NOT NULL DEFAULT 'outros', -- banner, upsell, video, gif, outros
  tags TEXT[], -- array of tags for filtering
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE public.product_materials ENABLE ROW LEVEL SECURITY;

-- Allow users to see all materials (no restrictions for now)
CREATE POLICY "Everyone can view product materials" ON public.product_materials
  FOR SELECT USING (true);

-- Allow authenticated users to create materials
CREATE POLICY "Authenticated users can create materials" ON public.product_materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own materials
CREATE POLICY "Users can update their own materials" ON public.product_materials
  FOR UPDATE USING (auth.uid() = created_by);

-- Allow users to delete their own materials
CREATE POLICY "Users can delete their own materials" ON public.product_materials
  FOR DELETE USING (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_materials_product_id ON public.product_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_category ON public.product_materials(category);
CREATE INDEX IF NOT EXISTS idx_product_materials_created_at ON public.product_materials(created_at DESC);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_product_materials_updated_at_trigger
    BEFORE UPDATE ON public.product_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_product_materials_updated_at();