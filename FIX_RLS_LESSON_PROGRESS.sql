-- Corrigir políticas RLS para a tabela lesson_progress
-- Este script permite que usuários autenticados insiram e atualizem seus próprios registros

-- Primeiro, vamos ver as políticas existentes (execute este SELECT no Supabase)
-- SELECT * FROM pg_policies WHERE tablename = 'lesson_progress';

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Users can view own progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON lesson_progress;

-- Criar novas políticas corretas
-- Política para SELECT (visualizar)
CREATE POLICY "Users can view own progress" 
ON lesson_progress 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para INSERT (criar novo progresso)
CREATE POLICY "Users can insert own progress" 
ON lesson_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE (atualizar progresso existente)
CREATE POLICY "Users can update own progress" 
ON lesson_progress 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para DELETE (opcional, caso queira permitir)
CREATE POLICY "Users can delete own progress" 
ON lesson_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Garantir que RLS está habilitado
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'lesson_progress';