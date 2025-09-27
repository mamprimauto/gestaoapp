-- Sistema de checklist e comentários para tarefas OKR
-- Criado para suportar detalhes de tarefas OKR similares aos criativos

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- TABELA: okr_task_checklist
-- ============================================
CREATE TABLE IF NOT EXISTS public.okr_task_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_task_id UUID NOT NULL REFERENCES public.okr_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS okr_task_checklist_okr_task_id_idx ON public.okr_task_checklist(okr_task_id);
CREATE INDEX IF NOT EXISTS okr_task_checklist_user_id_idx ON public.okr_task_checklist(user_id);
CREATE INDEX IF NOT EXISTS okr_task_checklist_position_idx ON public.okr_task_checklist(okr_task_id, position);

-- ============================================
-- RLS POLICIES: okr_task_checklist
-- ============================================
ALTER TABLE public.okr_task_checklist ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuário pode ver checklist das suas tarefas OKR
DROP POLICY IF EXISTS "okr_checklist_select_own_task" ON public.okr_task_checklist;
CREATE POLICY "okr_checklist_select_own_task"
ON public.okr_task_checklist FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.okr_tasks ot
    INNER JOIN public.key_results kr ON kr.id = ot.key_result_id  
    INNER JOIN public.okrs o ON o.id = kr.okr_id
    WHERE ot.id = okr_task_id 
    AND (o.created_by = auth.uid() OR ot.assignee_id = auth.uid())
  )
);

-- Policy: INSERT - Usuário pode criar checklist nas suas tarefas OKR
DROP POLICY IF EXISTS "okr_checklist_insert_own_task" ON public.okr_task_checklist;
CREATE POLICY "okr_checklist_insert_own_task"
ON public.okr_task_checklist FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.okr_tasks ot
    INNER JOIN public.key_results kr ON kr.id = ot.key_result_id  
    INNER JOIN public.okrs o ON o.id = kr.okr_id
    WHERE ot.id = okr_task_id 
    AND (o.created_by = auth.uid() OR ot.assignee_id = auth.uid())
  )
);

-- Policy: UPDATE - Usuário pode atualizar checklist nas suas tarefas OKR
DROP POLICY IF EXISTS "okr_checklist_update_own_task" ON public.okr_task_checklist;
CREATE POLICY "okr_checklist_update_own_task"
ON public.okr_task_checklist FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.okr_tasks ot
    INNER JOIN public.key_results kr ON kr.id = ot.key_result_id  
    INNER JOIN public.okrs o ON o.id = kr.okr_id
    WHERE ot.id = okr_task_id 
    AND (o.created_by = auth.uid() OR ot.assignee_id = auth.uid())
  )
);

-- Policy: DELETE - Usuário pode deletar checklist nas suas tarefas OKR
DROP POLICY IF EXISTS "okr_checklist_delete_own_task" ON public.okr_task_checklist;
CREATE POLICY "okr_checklist_delete_own_task"
ON public.okr_task_checklist FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.okr_tasks ot
    INNER JOIN public.key_results kr ON kr.id = ot.key_result_id  
    INNER JOIN public.okrs o ON o.id = kr.okr_id
    WHERE ot.id = okr_task_id 
    AND (o.created_by = auth.uid() OR ot.assignee_id = auth.uid())
  )
);

-- ============================================
-- TABELA: okr_task_comments
-- ============================================
CREATE TABLE IF NOT EXISTS public.okr_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_task_id UUID NOT NULL REFERENCES public.okr_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS okr_task_comments_okr_task_id_idx ON public.okr_task_comments(okr_task_id);
CREATE INDEX IF NOT EXISTS okr_task_comments_user_id_idx ON public.okr_task_comments(user_id);
CREATE INDEX IF NOT EXISTS okr_task_comments_created_at_idx ON public.okr_task_comments(created_at);

-- ============================================
-- RLS POLICIES: okr_task_comments
-- ============================================
ALTER TABLE public.okr_task_comments ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuário pode ver comentários das suas tarefas OKR
DROP POLICY IF EXISTS "okr_comments_select_own_task" ON public.okr_task_comments;
CREATE POLICY "okr_comments_select_own_task"
ON public.okr_task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.okr_tasks ot
    INNER JOIN public.key_results kr ON kr.id = ot.key_result_id  
    INNER JOIN public.okrs o ON o.id = kr.okr_id
    WHERE ot.id = okr_task_id 
    AND (o.created_by = auth.uid() OR ot.assignee_id = auth.uid())
  )
);

-- Policy: INSERT - Usuário pode criar comentários nas suas tarefas OKR
DROP POLICY IF EXISTS "okr_comments_insert_own_task" ON public.okr_task_comments;
CREATE POLICY "okr_comments_insert_own_task"
ON public.okr_task_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.okr_tasks ot
    INNER JOIN public.key_results kr ON kr.id = ot.key_result_id  
    INNER JOIN public.okrs o ON o.id = kr.okr_id
    WHERE ot.id = okr_task_id 
    AND (o.created_by = auth.uid() OR ot.assignee_id = auth.uid())
  )
);

-- Policy: UPDATE - Usuário pode atualizar próprios comentários
DROP POLICY IF EXISTS "okr_comments_update_own" ON public.okr_task_comments;
CREATE POLICY "okr_comments_update_own"
ON public.okr_task_comments FOR UPDATE
USING (user_id = auth.uid());

-- Policy: DELETE - Usuário pode deletar próprios comentários
DROP POLICY IF EXISTS "okr_comments_delete_own" ON public.okr_task_comments;
CREATE POLICY "okr_comments_delete_own"
ON public.okr_task_comments FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS: updated_at
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.okr_task_details_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger para okr_task_checklist
DROP TRIGGER IF EXISTS trg_okr_task_checklist_set_updated_at ON public.okr_task_checklist;
CREATE TRIGGER trg_okr_task_checklist_set_updated_at
  BEFORE UPDATE ON public.okr_task_checklist
  FOR EACH ROW EXECUTE PROCEDURE public.okr_task_details_set_updated_at();

-- Trigger para okr_task_comments
DROP TRIGGER IF EXISTS trg_okr_task_comments_set_updated_at ON public.okr_task_comments;
CREATE TRIGGER trg_okr_task_comments_set_updated_at
  BEFORE UPDATE ON public.okr_task_comments
  FOR EACH ROW EXECUTE PROCEDURE public.okr_task_details_set_updated_at();

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.okr_task_checklist IS 'Checklist items para tarefas OKR - permite organizar sub-tarefas';
COMMENT ON TABLE public.okr_task_comments IS 'Comentários para tarefas OKR - suporte a texto e imagens';

COMMENT ON COLUMN public.okr_task_checklist.position IS 'Posição do item na checklist para ordenação';
COMMENT ON COLUMN public.okr_task_comments.image_url IS 'URL da imagem/vídeo anexado ao comentário';