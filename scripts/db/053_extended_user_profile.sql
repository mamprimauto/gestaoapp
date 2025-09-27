-- ========================================================
-- EXTENDED USER PROFILE SYSTEM
-- Adiciona campos completos de perfil do usuário
-- ========================================================

-- Adicionar novos campos na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zipcode TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', null));

-- Criar índices para campos que podem ser pesquisados
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name) WHERE full_name IS NOT NULL;

-- Criar função para validar CPF (básica)
CREATE OR REPLACE FUNCTION public.is_valid_cpf(cpf_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove caracteres não numéricos
  cpf_input := regexp_replace(cpf_input, '[^0-9]', '', 'g');
  
  -- CPF deve ter 11 dígitos
  IF length(cpf_input) != 11 THEN
    RETURN FALSE;
  END IF;
  
  -- CPF não pode ser sequência repetida (111.111.111-11, etc)
  IF cpf_input ~ '^(.)\1{10}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Por simplificidade, aceitar qualquer CPF com 11 dígitos não repetidos
  -- Em produção, implementar validação completa com dígitos verificadores
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN public.profiles.full_name IS 'Nome completo do usuário';
COMMENT ON COLUMN public.profiles.birth_date IS 'Data de nascimento';
COMMENT ON COLUMN public.profiles.cpf IS 'CPF (apenas números)';
COMMENT ON COLUMN public.profiles.rg IS 'RG';
COMMENT ON COLUMN public.profiles.address_street IS 'Endereço - Rua/Avenida';
COMMENT ON COLUMN public.profiles.address_number IS 'Número do endereço';
COMMENT ON COLUMN public.profiles.address_complement IS 'Complemento do endereço';
COMMENT ON COLUMN public.profiles.address_neighborhood IS 'Bairro';
COMMENT ON COLUMN public.profiles.address_city IS 'Cidade';
COMMENT ON COLUMN public.profiles.address_state IS 'Estado (UF)';
COMMENT ON COLUMN public.profiles.address_zipcode IS 'CEP';
COMMENT ON COLUMN public.profiles.pix_key IS 'Chave PIX';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone com DDD';
COMMENT ON COLUMN public.profiles.marital_status IS 'Estado civil';

-- Atualizar trigger para incluir novos campos na atualização
DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.profiles_set_updated_at();