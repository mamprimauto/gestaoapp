-- Script para garantir que as tabelas do vault estão acessíveis
-- Execute este script no Supabase SQL Editor se o vault não estiver funcionando

-- 1. Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'vault_%';

-- 2. Contar registros em cada tabela
SELECT 'vault_items' as tabela, COUNT(*) as total FROM vault_items
UNION ALL
SELECT 'vault_settings', COUNT(*) FROM vault_settings
UNION ALL
SELECT 'vault_access_logs', COUNT(*) FROM vault_access_logs
UNION ALL
SELECT 'vault_sessions', COUNT(*) FROM vault_sessions;

-- 3. Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'vault_%';

-- 4. Se as tabelas existem mas não estão funcionando, recriar as políticas
-- (Apenas descomente e execute se necessário)

/*
-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can insert own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can update own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can delete own vault items" ON vault_items;

-- Recriar políticas
CREATE POLICY "Users can view own vault items" ON vault_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault items" ON vault_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items" ON vault_items
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault items" ON vault_items
    FOR DELETE USING (auth.uid() = user_id);
*/

-- 5. Garantir que RLS está ativo
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_sessions ENABLE ROW LEVEL SECURITY;

-- Se você ver este resultado, as tabelas estão funcionando!