-- Adicionar campos adicionais ao perfil do usuário

-- Adicionar campo phone (telefone)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adicionar campo department (departamento)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Adicionar campo position (cargo)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS position TEXT;

-- Adicionar campo location (localização)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Adicionar campo website
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Adicionar campo bio (biografia)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Adicionar comentário nas colunas para documentação
COMMENT ON COLUMN public.profiles.phone IS 'Telefone do usuário';
COMMENT ON COLUMN public.profiles.department IS 'Departamento onde o usuário trabalha';
COMMENT ON COLUMN public.profiles.position IS 'Cargo/Posição do usuário na empresa';
COMMENT ON COLUMN public.profiles.location IS 'Localização/Cidade do usuário';
COMMENT ON COLUMN public.profiles.website IS 'Website pessoal ou profissional';
COMMENT ON COLUMN public.profiles.bio IS 'Biografia/Descrição pessoal do usuário';