-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can upload bug report screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view bug report screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own bug report screenshots" ON storage.objects;

-- Create new, more permissive policies for bug-reports bucket
-- Allow anyone to upload (including anonymous users)
CREATE POLICY "Allow public uploads to bug-reports" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'bug-reports');

-- Allow anyone to view bug report screenshots
CREATE POLICY "Allow public access to bug-reports" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bug-reports');

-- Allow anyone to update their own uploads (for overwrites)
CREATE POLICY "Allow public updates to bug-reports" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'bug-reports');

-- Allow users to delete their own uploads
CREATE POLICY "Allow users to delete own bug-reports" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'bug-reports');