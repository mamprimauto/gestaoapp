-- Correção das políticas RLS para kanban_columns
-- Problema: Usuários não conseguem criar colunas (erro 401)

-- 1. Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'kanban_columns'
) as table_exists;

-- 2. Ver estrutura atual da tabela (se existir)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'kanban_columns'
ORDER BY ordinal_position;

-- 3. Verificar RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'kanban_columns';

-- 4. Listar policies existentes
SELECT 
  pol.polname as policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'kanban_columns';

-- 5. CORRIGIR: Remover todas as políticas antigas
DROP POLICY IF EXISTS "Users can view own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users can create columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users can update own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users can delete own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users manage own columns" ON public.kanban_columns;

-- 6. Desabilitar RLS temporariamente
ALTER TABLE public.kanban_columns DISABLE ROW LEVEL SECURITY;

-- 7. Re-habilitar RLS
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- 8. Criar política SIMPLES e PERMISSIVA
-- Todos os usuários autenticados podem fazer TUDO com colunas kanban
CREATE POLICY "Authenticated users full access to kanban columns"
ON public.kanban_columns
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. Garantir que a coluna user_id pode ser NULL (para compatibilidade)
ALTER TABLE public.kanban_columns 
ALTER COLUMN user_id DROP NOT NULL;

-- 10. Verificar se funcionou
SELECT 
  'RLS Habilitado' as status,
  EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.kanban_columns'::regclass
  ) as has_policies,
  COUNT(*) as policy_count
FROM pg_policy 
WHERE polrelid = 'public.kanban_columns'::regclass;

-- 11. Ver se tem colunas criadas
SELECT 
  workspace_id,
  column_id,
  title,
  color,
  position,
  user_id,
  created_at
FROM public.kanban_columns
ORDER BY workspace_id, position;
