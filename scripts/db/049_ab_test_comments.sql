-- Migração: Sistema de comentários para testes A/B
-- Baseado no sistema de task_comments existente

-- Tabela de comentários para testes A/B
CREATE TABLE IF NOT EXISTS public.ab_test_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id INTEGER NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS ab_test_comments_ab_test_id_idx ON public.ab_test_comments(ab_test_id);
CREATE INDEX IF NOT EXISTS ab_test_comments_user_id_idx ON public.ab_test_comments(user_id);
CREATE INDEX IF NOT EXISTS ab_test_comments_created_at_idx ON public.ab_test_comments(created_at DESC);

-- RLS (Row Level Security) - Sistema simplificado para colaboração
ALTER TABLE public.ab_test_comments ENABLE ROW LEVEL SECURITY;

-- Política de visualização: todos os usuários autenticados podem ver comentários
DROP POLICY IF EXISTS "ab_test_comments_select_policy" ON public.ab_test_comments;
CREATE POLICY "ab_test_comments_select_policy"
ON public.ab_test_comments FOR SELECT
USING (auth.role() = 'authenticated');

-- Política de inserção: usuários autenticados podem criar comentários
DROP POLICY IF EXISTS "ab_test_comments_insert_policy" ON public.ab_test_comments;
CREATE POLICY "ab_test_comments_insert_policy"
ON public.ab_test_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Política de atualização: usuários podem editar apenas seus próprios comentários
DROP POLICY IF EXISTS "ab_test_comments_update_policy" ON public.ab_test_comments;
CREATE POLICY "ab_test_comments_update_policy"
ON public.ab_test_comments FOR UPDATE
USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Política de exclusão: usuários podem excluir apenas seus próprios comentários
DROP POLICY IF EXISTS "ab_test_comments_delete_policy" ON public.ab_test_comments;
CREATE POLICY "ab_test_comments_delete_policy"
ON public.ab_test_comments FOR DELETE
USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Função e trigger para updated_at
CREATE OR REPLACE FUNCTION public.ab_test_comments_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ab_test_comments_set_updated_at ON public.ab_test_comments;
CREATE TRIGGER trg_ab_test_comments_set_updated_at
  BEFORE UPDATE ON public.ab_test_comments
  FOR EACH ROW EXECUTE PROCEDURE public.ab_test_comments_set_updated_at();

-- Comentários da tabela
COMMENT ON TABLE public.ab_test_comments IS 'Comentários para testes A/B - suporte a texto e anexos';
COMMENT ON COLUMN public.ab_test_comments.ab_test_id IS 'ID do teste A/B';
COMMENT ON COLUMN public.ab_test_comments.user_id IS 'ID do usuário que criou o comentário';
COMMENT ON COLUMN public.ab_test_comments.content IS 'Conteúdo do comentário em texto';
COMMENT ON COLUMN public.ab_test_comments.image_url IS 'URL da imagem/vídeo anexado ao comentário';

-- Verificação final
SELECT 'Tabela ab_test_comments criada com sucesso!' as resultado;