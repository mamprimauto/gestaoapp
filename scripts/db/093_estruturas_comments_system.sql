-- Sistema de comentários para Estruturas Invisíveis
-- Similar ao Google Docs - permite comentar em trechos específicos do texto

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS public.estruturas_invisiveis_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estrutura_id UUID NOT NULL REFERENCES public.estruturas_invisiveis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  selection_start INTEGER NOT NULL,
  selection_end INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para respostas aos comentários (thread)
CREATE TABLE IF NOT EXISTS public.estruturas_invisiveis_comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.estruturas_invisiveis_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_estruturas_comments_estrutura ON public.estruturas_invisiveis_comments(estrutura_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_comments_user ON public.estruturas_invisiveis_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_comments_created ON public.estruturas_invisiveis_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estruturas_comments_position ON public.estruturas_invisiveis_comments(selection_start, selection_end);

CREATE INDEX IF NOT EXISTS idx_estruturas_replies_comment ON public.estruturas_invisiveis_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_replies_user ON public.estruturas_invisiveis_comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_replies_created ON public.estruturas_invisiveis_comment_replies(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.estruturas_invisiveis_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estruturas_invisiveis_comment_replies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para comentários
DROP POLICY IF EXISTS "Users can view comments on their estruturas" ON public.estruturas_invisiveis_comments;
CREATE POLICY "Users can view comments on their estruturas" ON public.estruturas_invisiveis_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estruturas_invisiveis e 
      WHERE e.id = estrutura_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create comments on their estruturas" ON public.estruturas_invisiveis_comments;
CREATE POLICY "Users can create comments on their estruturas" ON public.estruturas_invisiveis_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estruturas_invisiveis e 
      WHERE e.id = estrutura_id AND e.user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.estruturas_invisiveis_comments;
CREATE POLICY "Users can update their own comments" ON public.estruturas_invisiveis_comments
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.estruturas_invisiveis_comments;
CREATE POLICY "Users can delete their own comments" ON public.estruturas_invisiveis_comments
  FOR DELETE USING (user_id = auth.uid());

-- Políticas RLS para respostas
DROP POLICY IF EXISTS "Users can view replies on accessible comments" ON public.estruturas_invisiveis_comment_replies;
CREATE POLICY "Users can view replies on accessible comments" ON public.estruturas_invisiveis_comment_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estruturas_invisiveis_comments c
      JOIN public.estruturas_invisiveis e ON e.id = c.estrutura_id
      WHERE c.id = comment_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create replies on accessible comments" ON public.estruturas_invisiveis_comment_replies;
CREATE POLICY "Users can create replies on accessible comments" ON public.estruturas_invisiveis_comment_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estruturas_invisiveis_comments c
      JOIN public.estruturas_invisiveis e ON e.id = c.estrutura_id
      WHERE c.id = comment_id AND e.user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own replies" ON public.estruturas_invisiveis_comment_replies;
CREATE POLICY "Users can update their own replies" ON public.estruturas_invisiveis_comment_replies
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own replies" ON public.estruturas_invisiveis_comment_replies;
CREATE POLICY "Users can delete their own replies" ON public.estruturas_invisiveis_comment_replies
  FOR DELETE USING (user_id = auth.uid());

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_estruturas_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estruturas_comments_updated_at ON public.estruturas_invisiveis_comments;
CREATE TRIGGER update_estruturas_comments_updated_at
  BEFORE UPDATE ON public.estruturas_invisiveis_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_estruturas_comments_updated_at();

DROP TRIGGER IF EXISTS update_estruturas_replies_updated_at ON public.estruturas_invisiveis_comment_replies;
CREATE TRIGGER update_estruturas_replies_updated_at
  BEFORE UPDATE ON public.estruturas_invisiveis_comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_estruturas_comments_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.estruturas_invisiveis_comments IS 'Comentários em trechos específicos das estruturas invisíveis';
COMMENT ON COLUMN public.estruturas_invisiveis_comments.selection_start IS 'Posição inicial do texto selecionado';
COMMENT ON COLUMN public.estruturas_invisiveis_comments.selection_end IS 'Posição final do texto selecionado';
COMMENT ON COLUMN public.estruturas_invisiveis_comments.selected_text IS 'Texto que foi selecionado para comentar';
COMMENT ON COLUMN public.estruturas_invisiveis_comments.resolved IS 'Se o comentário foi marcado como resolvido';

COMMENT ON TABLE public.estruturas_invisiveis_comment_replies IS 'Respostas aos comentários (sistema de thread)';

-- Verificar se funcionou
SELECT 
  'Sistema de comentários criado!' as status,
  COUNT(DISTINCT table_name) as tabelas_criadas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('estruturas_invisiveis_comments', 'estruturas_invisiveis_comment_replies');