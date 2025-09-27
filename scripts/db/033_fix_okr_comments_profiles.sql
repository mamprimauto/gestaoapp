-- Migration: Corrigir relação entre okr_task_comments e profiles
-- Objetivo: Adicionar foreign key constraint para permitir JOIN com profiles

-- ============================================
-- ADICIONAR FOREIGN KEY CONSTRAINT
-- ============================================

-- Primeiro verificar se existe algum user_id inválido na tabela
DO $$
BEGIN
  -- Limpar qualquer comentário com user_id que não existe em profiles
  DELETE FROM public.okr_task_comments 
  WHERE user_id NOT IN (SELECT id FROM public.profiles);
  
  RAISE NOTICE 'Limpeza de comentários com user_id inválido concluída';
END $$;

-- Adicionar foreign key constraint entre okr_task_comments.user_id e profiles.id
ALTER TABLE public.okr_task_comments 
ADD CONSTRAINT okr_task_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON CONSTRAINT okr_task_comments_user_id_fkey ON public.okr_task_comments 
IS 'Foreign key constraint para relacionar comentários com perfis de usuário';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Migration 033 executada com sucesso - Foreign key constraint adicionada';
END $$;