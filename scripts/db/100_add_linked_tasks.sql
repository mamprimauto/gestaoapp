-- Migration 100: Add support for linked cross-department tasks
-- This enables tasks to be mirrored between departments for cross-collaboration

-- Add fields for linked tasks
ALTER TABLE tasks 
ADD COLUMN linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN request_type VARCHAR(20) CHECK (request_type IN ('sent', 'received'));

-- Create index for efficient queries on linked tasks
CREATE INDEX idx_tasks_linked_task_id ON tasks(linked_task_id);

-- Create index for request type filtering
CREATE INDEX idx_tasks_request_type ON tasks(request_type);

-- Comment for documentation
COMMENT ON COLUMN tasks.linked_task_id IS 'References the paired task in another department for cross-department requests';
COMMENT ON COLUMN tasks.request_type IS 'Indicates if this is a sent request, received request, or regular task (null)';