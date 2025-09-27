-- Create storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-reports',
  'bug-reports',
  true, -- Make it public for easy viewing
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for bug-reports bucket
CREATE POLICY "Anyone can upload bug report screenshots" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'bug-reports');

CREATE POLICY "Anyone can view bug report screenshots" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bug-reports');

CREATE POLICY "Users can delete their own bug report screenshots" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'bug-reports' AND (auth.uid()::text = owner OR owner IS NULL));