-- Migration 100: Add remaining fields for linked cross-department tasks

-- Add request_type field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='request_type') THEN
        ALTER TABLE tasks ADD COLUMN request_type VARCHAR(20) CHECK (request_type IN ('sent', 'received'));
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tasks_linked_task_id ON tasks(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_request_type ON tasks(request_type);

-- Add comments for documentation
COMMENT ON COLUMN tasks.linked_task_id IS 'References the paired task in another department for cross-department requests';
COMMENT ON COLUMN tasks.request_type IS 'Indicates if this is a sent request, received request, or regular task (null)';