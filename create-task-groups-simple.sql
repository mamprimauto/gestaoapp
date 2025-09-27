-- Create task_groups table
CREATE TABLE IF NOT EXISTS public.task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'folder',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add group_id column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.task_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_groups
CREATE POLICY IF NOT EXISTS "task_groups_select_own" ON public.task_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "task_groups_insert_own" ON public.task_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "task_groups_update_own" ON public.task_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "task_groups_delete_own" ON public.task_groups FOR DELETE USING (auth.uid() = user_id);