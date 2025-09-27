-- Verificar constraints da tabela profiles
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
AND contype = 'c'; -- Check constraints

-- Ver valores permitidos para role
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'role';

-- Ver usuários pendentes
SELECT id, email, name, role, approved
FROM public.profiles
WHERE approved = false OR approved IS NULL;
