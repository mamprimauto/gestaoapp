-- Simples fix para okr_task_comments -> profiles relationship
-- Execute este SQL no Supabase Dashboard

-- Adicionar foreign key constraint
ALTER TABLE public.okr_task_comments 
ADD CONSTRAINT okr_task_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;