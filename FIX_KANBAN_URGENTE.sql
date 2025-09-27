-- CORREÇÃO URGENTE PARA KANBAN_COLUMNS
-- Execute TODAS essas queries no Supabase SQL Editor

-- ==================================================
-- PARTE 1: DIAGNÓSTICO
-- ==================================================

-- Verificar se a tabela existe
SELECT 'Tabela existe?' as pergunta, 
       EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'kanban_columns'
       ) as resposta;

-- Ver status do RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'kanban_columns';

-- ==================================================
-- PARTE 2: CRIAR TABELA SE NÃO EXISTIR
-- ==================================================

CREATE TABLE IF NOT EXISTS public.kanban_columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    column_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    title TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, column_id, user_id)
);

-- ==================================================
-- PARTE 3: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ==================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'kanban_columns'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.kanban_columns', pol.policyname);
    END LOOP;
END $$;

-- ==================================================
-- PARTE 4: DESABILITAR RLS COMPLETAMENTE
-- ==================================================

ALTER TABLE public.kanban_columns DISABLE ROW LEVEL SECURITY;

-- ==================================================
-- PARTE 5: VERIFICAR QUE RLS ESTÁ DESABILITADO
-- ==================================================

SELECT 
    'RLS Status' as info,
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DESABILITADO - DEVE FUNCIONAR AGORA'
        ELSE '❌ RLS ainda ativo - problema!'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'kanban_columns';

-- ==================================================
-- PARTE 6: GARANTIR PERMISSÕES NA TABELA
-- ==================================================

-- Dar todas as permissões para authenticated e anon
GRANT ALL ON public.kanban_columns TO authenticated;
GRANT ALL ON public.kanban_columns TO anon;
GRANT ALL ON public.kanban_columns TO service_role;

-- ==================================================
-- PARTE 7: TESTE - INSERIR UMA COLUNA
-- ==================================================

-- Teste inserindo uma coluna (remova os -- para executar)
-- INSERT INTO public.kanban_columns (
--     column_id, 
--     workspace_id, 
--     title, 
--     color, 
--     position,
--     user_id
-- ) VALUES (
--     'test-' || gen_random_uuid()::text,
--     'copy',
--     'Coluna Teste',
--     '#FF0000',
--     999,
--     'f3f3ebbe-b466-4afd-afef-0339ab05bc22'
-- ) ON CONFLICT DO NOTHING;

-- ==================================================
-- PARTE 8: VER TODAS AS COLUNAS
-- ==================================================

SELECT * FROM public.kanban_columns ORDER BY workspace_id, position;

-- ==================================================
-- OPÇÃO ALTERNATIVA: SE QUISER RLS ATIVO MAS PERMISSIVO
-- ==================================================

-- Se você preferir manter o RLS ativo mas com política ultra permissiva:
-- (Execute apenas se quiser RLS ativo)

-- ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Everyone can do everything"
-- ON public.kanban_columns
-- FOR ALL
-- TO public
-- USING (true)
-- WITH CHECK (true);

-- ==================================================
-- INFORMAÇÃO FINAL
-- ==================================================

SELECT 
    '🎯 RESULTADO FINAL' as status,
    CASE 
        WHEN rowsecurity = false THEN 'RLS DESABILITADO - Kanban deve funcionar agora!'
        ELSE 'RLS ATIVO - Verifique as políticas'
    END as resultado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'kanban_columns';
