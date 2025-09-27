-- 🔄 RESET COMPLETO E RECONFIGURAÇÃO DO VAULT
-- Execute LINHA POR LINHA no Supabase SQL Editor

-- ===== PASSO 1: VER ESTADO ATUAL =====
SELECT 'Estado atual:' as info;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('vault_items', 'user_permissions') 
ORDER BY table_name, column_name;

-- ===== PASSO 2: DROPAR TUDO E RECOMEÇAR =====
-- Remover tabelas se existirem
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS vault_items CASCADE;

-- Remover tipos se existirem  
DROP TYPE IF EXISTS vault_visibility_level CASCADE;
DROP TYPE IF EXISTS user_department CASCADE;
DROP TYPE IF EXISTS user_access_level CASCADE;

-- ===== PASSO 3: RECRIAR TIPOS COM NOVOS DEPARTAMENTOS =====
CREATE TYPE vault_visibility_level AS ENUM (
    'personal', 'team', 'manager', 'admin', 'custom'
);

CREATE TYPE user_department AS ENUM (
    'administrador', 'editor', 'copywriter', 'gestor', 'minerador', 'particular'
);

CREATE TYPE user_access_level AS ENUM (
    'user', 'manager', 'admin'
);

-- ===== PASSO 4: RECRIAR TABELA DE PERMISSÕES =====
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    department user_department NOT NULL DEFAULT 'particular',
    access_level user_access_level NOT NULL DEFAULT 'user',
    additional_departments user_department[] DEFAULT '{}',
    can_create_shared BOOLEAN DEFAULT false,
    can_access_cross_department BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PASSO 5: RECRIAR TABELA VAULT_ITEMS =====
CREATE TABLE vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadados
    title TEXT NOT NULL,
    url TEXT,
    username TEXT,
    category TEXT DEFAULT 'other',
    favorite BOOLEAN DEFAULT false,
    
    -- Dados criptografados
    encrypted_password TEXT NOT NULL,
    encrypted_notes TEXT,
    
    -- Criptografia
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    
    -- Segurança
    strength_score INTEGER DEFAULT 0,
    has_breach BOOLEAN DEFAULT false,
    breach_count INTEGER DEFAULT 0,
    
    -- NOVOS CAMPOS DE PERMISSÕES
    visibility_level vault_visibility_level DEFAULT 'personal',
    allowed_departments user_department[] DEFAULT '{}',
    created_by_department user_department DEFAULT 'particular',
    shared_with_managers BOOLEAN DEFAULT false,
    shared_with_admins BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT vault_items_title_not_empty CHECK (length(title) > 0),
    CONSTRAINT vault_items_encrypted_password_not_empty CHECK (length(encrypted_password) > 0),
    CONSTRAINT vault_items_salt_not_empty CHECK (length(salt) > 0),
    CONSTRAINT vault_items_iv_not_empty CHECK (length(iv) > 0),
    CONSTRAINT vault_items_strength_score_valid CHECK (strength_score >= 0 AND strength_score <= 100)
);

-- ===== PASSO 6: FUNÇÃO DE VERIFICAÇÃO DE PERMISSÕES =====
CREATE OR REPLACE FUNCTION can_user_access_vault_item(
    user_uuid UUID, 
    item_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
    user_record RECORD;
BEGIN
    SELECT * INTO item_record FROM vault_items WHERE id = item_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    IF item_record.user_id = user_uuid THEN RETURN TRUE; END IF;
    
    SELECT * INTO user_record FROM user_permissions WHERE user_id = user_uuid;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    CASE item_record.visibility_level
        WHEN 'personal' THEN RETURN FALSE;
        WHEN 'team' THEN 
            RETURN (user_record.department = item_record.created_by_department) 
                OR (item_record.created_by_department = ANY(user_record.additional_departments));
        WHEN 'manager' THEN
            RETURN (user_record.access_level IN ('manager', 'admin'))
                OR (user_record.department = item_record.created_by_department)
                OR (item_record.created_by_department = ANY(user_record.additional_departments));
        WHEN 'admin' THEN 
            RETURN user_record.access_level = 'admin';
        WHEN 'custom' THEN
            RETURN (user_record.department = ANY(item_record.allowed_departments))
                OR (user_record.access_level = 'admin');
        ELSE RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== PASSO 7: RLS POLICIES =====
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible vault items" ON vault_items
    FOR SELECT USING (
        user_id = auth.uid() 
        OR can_user_access_vault_item(auth.uid(), id)
    );

CREATE POLICY "Users can create vault items" ON vault_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update accessible vault items" ON vault_items
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR (EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND access_level = 'admin'))
    );

CREATE POLICY "Users can delete accessible vault items" ON vault_items
    FOR DELETE USING (
        user_id = auth.uid() 
        OR (EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND access_level = 'admin'))
    );

CREATE POLICY "Users can view own permissions" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND access_level = 'admin')
    );

-- ===== PASSO 8: TRIGGER PARA DEPARTAMENTO AUTOMÁTICO =====
CREATE OR REPLACE FUNCTION set_vault_item_department()
RETURNS TRIGGER AS $$
BEGIN
    SELECT department INTO NEW.created_by_department
    FROM user_permissions 
    WHERE user_id = NEW.user_id;
    
    IF NEW.created_by_department IS NULL THEN
        NEW.created_by_department := 'particular';
    END IF;
    
    IF NEW.visibility_level IS NULL THEN
        NEW.visibility_level := 'personal';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vault_item_department_trigger
    BEFORE INSERT ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION set_vault_item_department();

-- ===== PASSO 9: CRIAR PERMISSÕES PADRÃO =====
INSERT INTO user_permissions (user_id, department, access_level)
SELECT 
    id,
    'particular'::user_department,
    'user'::user_access_level
FROM auth.users 
ON CONFLICT (user_id) DO NOTHING;

-- ===== PASSO 10: ÍNDICES =====
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX idx_vault_items_visibility ON vault_items(visibility_level);

-- ===== VERIFICAÇÃO FINAL =====
SELECT 'SUCESSO! Tabelas recriadas:' as resultado;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('vault_items', 'user_permissions');

SELECT 'Departamentos disponíveis:' as info;
SELECT unnest(enum_range(NULL::user_department)) as departamentos;