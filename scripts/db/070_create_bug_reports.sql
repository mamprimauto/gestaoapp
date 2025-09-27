-- Create bug_reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reported_by UUID REFERENCES auth.users(id),
  reporter_name TEXT,
  reporter_email TEXT,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  browser_info TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_created_at ON bug_reports(created_at DESC);
CREATE INDEX idx_bug_reports_reported_by ON bug_reports(reported_by);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policy for users to create their own bug reports
CREATE POLICY "Users can create bug reports" ON bug_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by OR reported_by IS NULL);

-- Policy for users to view their own bug reports  
CREATE POLICY "Users can view their own bug reports" ON bug_reports
  FOR SELECT
  USING (auth.uid() = reported_by OR reported_by IS NULL);

-- Policy for admins to view all bug reports
CREATE POLICY "Admins can view all bug reports" ON bug_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );