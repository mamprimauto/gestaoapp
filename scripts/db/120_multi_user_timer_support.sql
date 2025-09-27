-- Migration: Multi-user timer support
-- Allows multiple users to have active timer sessions on the same task simultaneously

-- Update RLS policies to allow viewing other users' timer sessions for the same task
-- This enables showing who is currently working on a task

-- Drop existing policies
drop policy if exists "time_sessions_select_own" on public.task_time_sessions;

-- New policy: Users can see all timer sessions for tasks they have access to
-- This allows displaying multiple active timers on the same task
create policy "time_sessions_select_task_access"
on public.task_time_sessions for select
using (
  -- User can see their own sessions
  auth.uid() = user_id 
  OR 
  -- User can see sessions from tasks in their workspace
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_time_sessions.task_id
    AND (
      -- Task is in a workspace the user has access to
      t.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
      )
      OR
      -- Task is a personal task of the user  
      t.user_id = auth.uid()
    )
  )
);

-- Keep other policies unchanged (users can only modify their own sessions)
-- Insert policy remains the same
drop policy if exists "time_sessions_insert_own" on public.task_time_sessions;
create policy "time_sessions_insert_own"
on public.task_time_sessions for insert
with check (auth.uid() = user_id);

-- Update policy remains the same  
drop policy if exists "time_sessions_update_own" on public.task_time_sessions;
create policy "time_sessions_update_own"
on public.task_time_sessions for update
using (auth.uid() = user_id);

-- Delete policy remains the same
drop policy if exists "time_sessions_delete_own" on public.task_time_sessions;
create policy "time_sessions_delete_own"
on public.task_time_sessions for delete
using (auth.uid() = user_id);

-- Add index for better performance when querying active sessions
create index if not exists idx_task_time_sessions_active 
on public.task_time_sessions(task_id, user_id) 
where end_time is null;

-- Add composite index for task + active sessions
create index if not exists idx_task_time_sessions_task_active
on public.task_time_sessions(task_id, end_time);