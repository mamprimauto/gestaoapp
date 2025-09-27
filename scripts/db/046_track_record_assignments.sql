-- Track Record Assignments System
-- Allows assigning tests to specific team members with roles and deadlines

-- Create table for test assignments
CREATE TABLE IF NOT EXISTS track_record_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_record_id UUID NOT NULL REFERENCES track_records(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'analyst', 'reviewer', 'approver', 'viewer')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(track_record_id, assignee_id, role)
);

-- Create table for assignment notifications
CREATE TABLE IF NOT EXISTS track_record_assignment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES track_record_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('assigned', 'deadline_reminder', 'overdue', 'completed', 'reassigned')),
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_track_record_assignments_track_record_id ON track_record_assignments(track_record_id);
CREATE INDEX IF NOT EXISTS idx_track_record_assignments_assignee_id ON track_record_assignments(assignee_id);
CREATE INDEX IF NOT EXISTS idx_track_record_assignments_status ON track_record_assignments(status);
CREATE INDEX IF NOT EXISTS idx_track_record_assignments_due_date ON track_record_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_user_id ON track_record_assignment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_read_at ON track_record_assignment_notifications(read_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_track_record_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Auto-update status based on completion and due date
  IF NEW.completed_at IS NOT NULL AND NEW.status != 'completed' THEN
    NEW.status = 'completed';
  ELSIF NEW.completed_at IS NULL AND NEW.due_date IS NOT NULL AND NEW.due_date < NOW() AND NEW.status = 'pending' THEN
    NEW.status = 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assignments
CREATE OR REPLACE TRIGGER trigger_update_track_record_assignments_updated_at
  BEFORE UPDATE ON track_record_assignments
  FOR EACH ROW EXECUTE FUNCTION update_track_record_assignments_updated_at();

-- Function to create notification when assignment is created or updated
CREATE OR REPLACE FUNCTION create_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_type VARCHAR(50);
  notification_message TEXT;
BEGIN
  -- Determine notification type and message
  IF TG_OP = 'INSERT' THEN
    notification_type = 'assigned';
    notification_message = 'Você foi designado como ' || NEW.role || ' para o teste ' || 
                          (SELECT test_name FROM track_records WHERE id = NEW.track_record_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'completed' THEN
      notification_type = 'completed';
      notification_message = 'Tarefa concluída para o teste ' || 
                            (SELECT test_name FROM track_records WHERE id = NEW.track_record_id);
    ELSIF NEW.status = 'overdue' THEN
      notification_type = 'overdue';
      notification_message = 'Tarefa em atraso para o teste ' || 
                            (SELECT test_name FROM track_records WHERE id = NEW.track_record_id);
    END IF;
  END IF;

  -- Create notification if we have a type and message
  IF notification_type IS NOT NULL AND notification_message IS NOT NULL THEN
    INSERT INTO track_record_assignment_notifications (
      assignment_id,
      user_id,
      type,
      message
    ) VALUES (
      NEW.id,
      NEW.assignee_id,
      notification_type,
      notification_message
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notifications
CREATE OR REPLACE TRIGGER trigger_create_assignment_notification
  AFTER INSERT OR UPDATE ON track_record_assignments
  FOR EACH ROW EXECUTE FUNCTION create_assignment_notification();

-- RLS Policies for assignments
ALTER TABLE track_record_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_record_assignment_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignments if they're part of the organization or assigned to the test
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view relevant assignments" ON track_record_assignments;
  CREATE POLICY "Users can view relevant assignments" ON track_record_assignments
    FOR SELECT USING (
      assignee_id = auth.uid() OR
      assigner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_id 
        AND tr.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Users can create assignments for tests in their organization
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create assignments" ON track_record_assignments;
  CREATE POLICY "Users can create assignments" ON track_record_assignments
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM track_records tr 
        WHERE tr.id = track_record_id 
        AND tr.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Users can update assignments they created or are assigned to
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update relevant assignments" ON track_record_assignments;
  CREATE POLICY "Users can update relevant assignments" ON track_record_assignments
    FOR UPDATE USING (
      assignee_id = auth.uid() OR
      assigner_id = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Users can delete assignments they created
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own assignments" ON track_record_assignments;
  CREATE POLICY "Users can delete own assignments" ON track_record_assignments
    FOR DELETE USING (assigner_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notification policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their notifications" ON track_record_assignment_notifications;
  CREATE POLICY "Users can view their notifications" ON track_record_assignment_notifications
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "System can create notifications" ON track_record_assignment_notifications;
  CREATE POLICY "System can create notifications" ON track_record_assignment_notifications
    FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update their notifications" ON track_record_assignment_notifications;
  CREATE POLICY "Users can update their notifications" ON track_record_assignment_notifications
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;