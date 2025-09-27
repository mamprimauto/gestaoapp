-- 🔐 SISTEMA DE PERMISSÕES POR NÍVEL DE EQUIPE NO VAULT
-- Adiciona controle granular de visibilidade de senhas entre departamentos

-- ===== ENUM PARA NÍVEIS DE VISIBILIDADE =====
DO $$ BEGIN
    CREATE TYPE vault_visibility_level AS ENUM (
        'personal',    -- Apenas o criador
        'team',        -- Mesmo departamento
        'manager',     -- Gestores + criador  
        'admin',       -- Administradores globais
        'custom'       -- Departamentos específicos
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===== ENUM PARA DEPARTAMENTOS =====
DO $$ BEGIN
    CREATE TYPE user_department AS ENUM (
        'copy',
        'edicao', 
        'gestor',
        'particular'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===== ENUM PARA NÍVEIS DE USUÁRIO =====
DO $$ BEGIN
    CREATE TYPE user_access_level AS ENUM (
        'user',        -- Usuário comum
        'manager',     -- Gestor de departamento
        'admin'        -- Administrador global
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===== TABELA DE PERMISSÕES DE USUÁRIO =====
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Departamento do usuário
    department user_department NOT NULL DEFAULT 'particular',
    
    -- Nível de acesso do usuário
    access_level user_access_level NOT NULL DEFAULT 'user',
    
    -- Permissões especiais (array de departamentos que pode acessar)
    additional_departments user_department[] DEFAULT '{}',
    
    -- Pode criar senhas compartilhadas
    can_create_shared BOOLEAN DEFAULT false,
    
    -- Pode ver senhas de outros departamentos (apenas managers/admins)
    can_access_cross_department BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== EXTENSÃO DA TABELA VAULT_ITEMS =====
-- Adicionar campos de visibilidade e permissões

-- Adicionar novas colunas
ALTER TABLE vault_items 
ADD COLUMN IF NOT EXISTS visibility_level vault_visibility_level DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS allowed_departments user_department[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by_department user_department DEFAULT 'particular',
ADD COLUMN IF NOT EXISTS shared_with_managers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_with_admins BOOLEAN DEFAULT false;

-- ===== FUNÇÃO PARA OBTER DEPARTAMENTO DO USUÁRIO =====
CREATE OR REPLACE FUNCTION get_user_department(user_uuid UUID)
RETURNS user_department AS $$
DECLARE
    user_dept user_department;
BEGIN
    SELECT department INTO user_dept
    FROM user_permissions 
    WHERE user_id = user_uuid;
    
    -- Se não encontrar, retorna 'particular' como padrão
    RETURN COALESCE(user_dept, 'particular');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== FUNÇÃO PARA VERIFICAR PERMISSÕES =====
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
    SELECT * INTO item_record
    FROM vault_items 
    WHERE id = item_id;
    
    -- Se item não existe, sem acesso
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Se é o próprio criador, sempre tem acesso
    IF item_record.user_id = user_uuid THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar permissões do usuário
    SELECT * INTO user_record
    FROM user_permissions 
    WHERE user_id = user_uuid;
    
    -- Se usuário não tem permissões configuradas, apenas acesso pessoal
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    user_dept := user_record.department;
    
    -- Verificar por nível de visibilidade do item
    CASE item_record.visibility_level
        WHEN 'personal' THEN
            RETURN FALSE;  -- Apenas criador (já verificado acima)
            
        WHEN 'team' THEN
            -- Mesmo departamento OU departamento está nas permissões extras
            RETURN (user_dept = item_record.created_by_department) 
                OR (item_record.created_by_department = ANY(user_record.additional_departments));
            
        WHEN 'manager' THEN
            -- Gestores + mesmo departamento OU admins
            RETURN (user_record.access_level IN ('manager', 'admin'))
                OR (user_dept = item_record.created_by_department)
                OR (item_record.created_by_department = ANY(user_record.additional_departments));
                
        WHEN 'admin' THEN
            -- Apenas administradores
            RETURN user_record.access_level = 'admin';
            
        WHEN 'custom' THEN
            -- Departamentos específicos OU permissões extras
            RETURN (user_dept = ANY(item_record.allowed_departments))
                OR (user_record.access_level = 'admin')
                OR (user_record.can_access_cross_department AND user_record.access_level = 'manager');
                
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== POLÍTICAS RLS ATUALIZADAS =====

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can create own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can update own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can delete own vault items" ON vault_items;

-- Nova política para visualização com permissões
CREATE POLICY "Users can view accessible vault items" ON vault_items
    FOR SELECT USING (
        user_id = auth.uid() 
        OR can_user_access_vault_item(auth.uid(), id)
    );

-- Política para criação (sem mudanças)
CREATE POLICY "Users can create vault items" ON vault_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política para atualização (apenas próprios itens ou admins)
CREATE POLICY "Users can update accessible vault items" ON vault_items
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR (
            EXISTS (
                SELECT 1 FROM user_permissions 
                WHERE user_id = auth.uid() 
                AND access_level = 'admin'
            )
        )
    );

-- Política para deleção (apenas próprios itens ou admins)
CREATE POLICY "Users can delete accessible vault items" ON vault_items
    FOR DELETE USING (
        user_id = auth.uid() 
        OR (
            EXISTS (
                SELECT 1 FROM user_permissions 
                WHERE user_id = auth.uid() 
                AND access_level = 'admin'
            )
        )
    );

-- ===== POLÍTICAS PARA USER_PERMISSIONS =====
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_permissions 
            WHERE user_id = auth.uid() 
            AND access_level = 'admin'
        )
    );

-- ===== ÍNDICES PARA PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_department ON user_permissions(department);
CREATE INDEX IF NOT EXISTS idx_vault_items_visibility ON vault_items(visibility_level);
CREATE INDEX IF NOT EXISTS idx_vault_items_department ON vault_items(created_by_department);
CREATE INDEX IF NOT EXISTS idx_vault_items_allowed_departments ON vault_items USING GIN(allowed_departments);

-- ===== TRIGGER PARA DEFINIR DEPARTAMENTO AUTOMATICAMENTE =====
CREATE OR REPLACE FUNCTION set_vault_item_department()
RETURNS TRIGGER AS $$
BEGIN
    -- Definir departamento do criador automaticamente
    NEW.created_by_department := get_user_department(NEW.user_id);
    
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

-- ===== DADOS INICIAIS (OPCIONAL) =====
-- Criar permissões padrão para usuários existentes
INSERT INTO user_permissions (user_id, department, access_level)
SELECT 
    id,
    'particular'::user_department,
    'user'::user_access_level
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_permissions)
ON CONFLICT (user_id) DO NOTHING;

-- ===== VERIFICAÇÃO FINAL =====
SELECT 
    'Sistema de permissões instalado com sucesso!' as resultado,
    COUNT(*) as usuarios_com_permissoes
FROM user_permissions;