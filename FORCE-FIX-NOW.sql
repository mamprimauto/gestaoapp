-- FORÇA REMOÇÃO COMPLETA DE TODOS OS TRIGGERS
-- Execute no Supabase SQL Editor AGORA

-- 1. DESABILITAR TODOS OS TRIGGERS DA TABELA
ALTER TABLE internal_financial_data DISABLE TRIGGER ALL;

-- 2. LISTAR E REMOVER TODOS OS TRIGGERS (se existirem)
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'internal_financial_data'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON internal_financial_data';
    END LOOP;
END $$;

-- 3. REMOVER FUNÇÃO PROBLEMÁTICA SE EXISTIR
DROP FUNCTION IF EXISTS calculate_financial_indicators();
DROP FUNCTION IF EXISTS calculate_financial_indicators_trigger();

-- 4. VERIFICAR SE TRIGGERS FORAM REMOVIDOS (deve retornar vazio)
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'internal_financial_data';

-- 5. CRIAR POLÍTICA SUPER PERMISSIVA PARA SISTEMA INTERNO
ALTER TABLE internal_financial_data ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas antigas
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'internal_financial_data'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON internal_financial_data';
    END LOOP;
END $$;

-- Criar política que permite TUDO (sistema interno)
CREATE POLICY "allow_all_internal" ON internal_financial_data
    FOR ALL 
    TO public
    USING (true) 
    WITH CHECK (true);

-- 6. GARANTIR PERMISSÕES COMPLETAS
GRANT ALL ON internal_financial_data TO anon, authenticated, public;

COMMENT ON TABLE internal_financial_data IS 'Sistema interno - sem triggers - livre para inserção';