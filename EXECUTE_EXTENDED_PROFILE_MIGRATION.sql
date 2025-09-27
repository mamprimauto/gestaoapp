-- ========================================================
-- EXECUTAR MIGRAÇÃO DE PERFIL ESTENDIDO
-- Execute este SQL no painel do Supabase
-- ========================================================

-- Copie e execute o conteúdo do arquivo:
-- scripts/db/053_extended_user_profile.sql

-- Para verificar se funcionou corretamente, execute:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Deve mostrar todas as colunas novas:
-- - full_name
-- - birth_date
-- - cpf
-- - rg
-- - address_street
-- - address_number
-- - address_complement
-- - address_neighborhood
-- - address_city
-- - address_state
-- - address_zipcode
-- - pix_key
-- - phone
-- - marital_status