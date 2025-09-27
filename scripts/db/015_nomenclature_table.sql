-- Create product nomenclatures table (simple version)
CREATE TABLE IF NOT EXISTS product_nomenclatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL UNIQUE,
  nomenclature jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_nomenclatures_product_id ON product_nomenclatures(product_id);

-- Enable RLS
ALTER TABLE product_nomenclatures ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read and write
CREATE POLICY "Allow all operations for authenticated users" ON product_nomenclatures
  FOR ALL USING (auth.role() = 'authenticated');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_nomenclatures_updated_at BEFORE UPDATE
    ON product_nomenclatures FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default nomenclatures
INSERT INTO product_nomenclatures (product_id, nomenclature) VALUES 
  ('nutra-memoria', '{"prefixo_oferta": "NM", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}'),
  ('nutra-emagrecimento', '{"prefixo_oferta": "NE", "numeracao_inicial": 1, "iniciais_copy_padrao": "AUTO", "iniciais_editor_padrao": "AUTO", "fonte_trafego_padrao": "FB"}')
ON CONFLICT (product_id) DO NOTHING;