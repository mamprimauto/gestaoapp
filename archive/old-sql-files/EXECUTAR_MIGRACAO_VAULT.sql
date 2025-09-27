-- 🔐 MIGRAÇÃO SIMPLIFICADA - SISTEMA DE PERMISSÕES DO VAULT
-- Copie e cole ESTE ARQUIVO COMPLETO no Supabase SQL Editor

-- ===== PARTE 1: CRIAR ENUMS =====
DO $$ BEGIN
    CREATE TYPE vault_visibility_level AS ENUM (
        'personal', 'team', 'manager', 'admin', 'custom'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_department AS ENUM (
        'administrador', 'editor', 'copywriter', 'gestor', 'minerador', 'particular'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_access_level AS ENUM (
        'user', 'manager', 'admin'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== PARTE 2: CRIAR TABELA DE PERMISSÕES =====
CREATE TABLE IF NOT EXISTS user_permissions (
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

-- ===== PARTE 3: ADICIONAR COLUNAS AO VAULT_ITEMS =====
ALTER TABLE vault_items 
ADD COLUMN IF NOT EXISTS visibility_level vault_visibility_level DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS allowed_departments user_department[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by_department user_department DEFAULT 'particular',
ADD COLUMN IF NOT EXISTS shared_with_managers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_with_admins BOOLEAN DEFAULT false;

-- ===== PARTE 4: FUNÇÃO PARA VERIFICAR PERMISSÕES =====
CREATE OR REPLACE FUNCTION can_user_access_vault_item(
    user_uuid UUID, 
    item_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
    user_record RECORD;
    user_dept user_department;
BEGIN
    -- Buscar informações do item
    SELECT * INTO item_record FROM vault_items WHERE id = item_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Se é o próprio criador, sempre tem acesso
    IF item_record.user_id = user_uuid THEN RETURN TRUE; END IF;
    
    -- Buscar permissões do usuário
    SELECT * INTO user_record FROM user_permissions WHERE user_id = user_uuid;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    user_dept := user_record.department;
    
    -- Verificar por nível de visibilidade do item
    CASE item_record.visibility_level
        WHEN 'personal' THEN RETURN FALSE;
        WHEN 'team' THEN 
            RETURN (user_dept = item_record.created_by_department) 
                OR (item_record.created_by_department = ANY(user_record.additional_departments));
        WHEN 'manager' THEN
            RETURN (user_record.access_level IN ('manager', 'admin'))
                OR (user_dept = item_record.created_by_department)
                OR (item_record.created_by_department = ANY(user_record.additional_departments));
        WHEN 'admin' THEN 
            RETURN user_record.access_level = 'admin';
        WHEN 'custom' THEN
            RETURN (user_dept = ANY(item_record.allowed_departments))
                OR (user_record.access_level = 'admin')
                OR (user_record.can_access_cross_department AND user_record.access_level = 'manager');
        ELSE RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== PARTE 5: ATUALIZAR RLS POLICIES =====
DROP POLICY IF EXISTS "Users can view own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can create own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can update own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can delete own vault items" ON vault_items;

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

-- ===== PARTE 6: RLS PARA USER_PERMISSIONS =====
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND access_level = 'admin')
    );

-- ===== PARTE 7: TRIGGER PARA DEFINIR DEPARTAMENTO =====
CREATE OR REPLACE FUNCTION set_vault_item_department()
RETURNS TRIGGER AS $$
BEGIN
    -- Buscar departamento do usuário
    SELECT department INTO NEW.created_by_department
    FROM user_permissions 
    WHERE user_id = NEW.user_id;
    
    -- Se não encontrar, usar 'particular' como padrão
    IF NEW.created_by_department IS NULL THEN
        NEW.created_by_department := 'particular';
    END IF;
    
    -- Se não especificou visibilidade, usar 'personal' como padrão
    IF NEW.visibility_level IS NULL THEN
        NEW.visibility_level := 'personal';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_vault_item_department_trigger ON vault_items;
CREATE TRIGGER set_vault_item_department_trigger
    BEFORE INSERT ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION set_vault_item_department();

-- ===== PARTE 8: CRIAR PERMISSÕES PADRÃO =====
INSERT INTO user_permissions (user_id, department, access_level)
SELECT 
    id,
    'particular'::user_department,
    'user'::user_access_level
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_permissions)
ON CONFLICT (user_id) DO NOTHING;

-- ===== PARTE 9: ÍNDICES PARA PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_department ON user_permissions(department);
CREATE INDEX IF NOT EXISTS idx_vault_items_visibility ON vault_items(visibility_level);
CREATE INDEX IF NOT EXISTS idx_vault_items_department ON vault_items(created_by_department);
CREATE INDEX IF NOT EXISTS idx_vault_items_allowed_departments ON vault_items USING GIN(allowed_departments);

-- ===== VERIFICAÇÃO FINAL =====
SELECT 
    'SUCESSO! Sistema de permissões instalado!' as resultado,
    COUNT(*) as usuarios_com_permissoes
FROM user_permissions;