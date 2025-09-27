-- Task Groups System
-- Allows organizing tasks into groups for better organization

-- Create task_groups table
CREATE TABLE IF NOT EXISTS public.task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6', -- Default blue color
  icon text DEFAULT 'folder', -- Default folder icon
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique position per user
  UNIQUE(user_id, position)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS task_groups_user_id_idx ON public.task_groups(user_id);
CREATE INDEX IF NOT EXISTS task_groups_position_idx ON public.task_groups(user_id, position);

-- Enable RLS
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_groups
DROP POLICY IF EXISTS "task_groups_select_own" ON public.task_groups;
CREATE POLICY "task_groups_select_own"
ON public.task_groups FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_groups_insert_own" ON public.task_groups;
CREATE POLICY "task_groups_insert_own"
ON public.task_groups FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_groups_update_own" ON public.task_groups;
CREATE POLICY "task_groups_update_own"
ON public.task_groups FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_groups_delete_own" ON public.task_groups;
CREATE POLICY "task_groups_delete_own"
ON public.task_groups FOR DELETE
USING (auth.uid() = user_id);

-- Add group_id column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.task_groups(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS tasks_group_id_idx ON public.tasks(group_id);

-- Trigger for updated_at on task_groups
DROP TRIGGER IF EXISTS trg_task_groups_set_updated_at ON public.task_groups;
CREATE TRIGGER trg_task_groups_set_updated_at
BEFORE UPDATE ON public.task_groups
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Function to automatically adjust positions when inserting/updating groups
CREATE OR REPLACE FUNCTION public.adjust_task_group_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If inserting, make sure we don't have conflicts
  IF TG_OP = 'INSERT' THEN
    -- If position already exists, shift all groups at that position and above
    UPDATE public.task_groups 
    SET position = position + 1
    WHERE user_id = NEW.user_id 
      AND position >= NEW.position 
      AND id != NEW.id;
      
    RETURN NEW;
  END IF;
  
  -- If updating position
  IF TG_OP = 'UPDATE' AND OLD.position != NEW.position THEN
    -- If moving to a higher position, shift down the ones in between
    IF NEW.position > OLD.position THEN
      UPDATE public.task_groups 
      SET position = position - 1
      WHERE user_id = NEW.user_id 
        AND position > OLD.position 
        AND position <= NEW.position 
        AND id != NEW.id;
    -- If moving to a lower position, shift up the ones in between
    ELSE
      UPDATE public.task_groups 
      SET position = position + 1
      WHERE user_id = NEW.user_id 
        AND position >= NEW.position 
        AND position < OLD.position 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for position management
DROP TRIGGER IF EXISTS trg_task_groups_adjust_positions_insert ON public.task_groups;
CREATE TRIGGER trg_task_groups_adjust_positions_insert
  BEFORE INSERT ON public.task_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_task_group_positions();

DROP TRIGGER IF EXISTS trg_task_groups_adjust_positions_update ON public.task_groups;
CREATE TRIGGER trg_task_groups_adjust_positions_update
  BEFORE UPDATE ON public.task_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_task_group_positions();

-- Function to handle group deletion and clean up positions
CREATE OR REPLACE FUNCTION public.cleanup_task_group_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a group is deleted, shift all groups with higher positions down
  UPDATE public.task_groups 
  SET position = position - 1
  WHERE user_id = OLD.user_id 
    AND position > OLD.position;
    
  RETURN OLD;
END;
$$;

-- Create trigger for cleanup on delete
DROP TRIGGER IF EXISTS trg_task_groups_cleanup_positions ON public.task_groups;
CREATE TRIGGER trg_task_groups_cleanup_positions
  AFTER DELETE ON public.task_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_task_group_positions();

-- Create some default groups for existing users (optional)
-- This will create a "Geral" group for users who don't have any groups yet
INSERT INTO public.task_groups (user_id, name, description, color, icon, position)
SELECT DISTINCT 
  t.user_id,
  'Geral' as name,
  'Grupo padrão para organizar tarefas' as description,
  '#6b7280' as color,
  'folder' as icon,
  0 as position
FROM public.tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_groups tg WHERE tg.user_id = t.user_id
)
ON CONFLICT (user_id, position) DO NOTHING;