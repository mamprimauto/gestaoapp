-- 🔄 MIGRAÇÃO FINAL - Atualizar Departamentos
-- Execute este script COMPLETO no Supabase SQL Editor

-- ===== PARTE 1: BACKUP E LIMPEZA =====

-- Primeiro, vamos ver o que temos atualmente
SELECT 'Estado atual dos departamentos:' as info;
SELECT department, COUNT(*) as total 
FROM user_permissions 
GROUP BY department;

-- ===== PARTE 2: REMOVER CONSTRAINTS E TIPOS ANTIGOS =====

-- Remover constraints das colunas que usam o enum
ALTER TABLE user_permissions 
DROP CONSTRAINT IF EXISTS user_permissions_department_check;

ALTER TABLE user_permissions 
DROP CONSTRAINT IF EXISTS user_permissions_additional_departments_check;

ALTER TABLE vault_items 
DROP CONSTRAINT IF EXISTS vault_items_created_by_department_check;

ALTER TABLE vault_items 
DROP CONSTRAINT IF EXISTS vault_items_allowed_departments_check;

-- Converter colunas para TEXT temporariamente
ALTER TABLE user_permissions 
ALTER COLUMN department TYPE TEXT,
ALTER COLUMN additional_departments TYPE TEXT[];

ALTER TABLE vault_items 
ALTER COLUMN created_by_department TYPE TEXT,
ALTER COLUMN allowed_departments TYPE TEXT[];

-- Remover os enums antigos
DROP TYPE IF EXISTS user_department CASCADE;
DROP TYPE IF EXISTS vault_visibility_level CASCADE;
DROP TYPE IF EXISTS user_access_level CASCADE;

-- ===== PARTE 3: CRIAR NOVOS ENUMS =====

CREATE TYPE vault_visibility_level AS ENUM (
    'personal', 'team', 'manager', 'admin', 'custom'
);

CREATE TYPE user_department AS ENUM (
    'administrador', 'editor', 'copywriter', 'gestor', 'minerador', 'particular'
);

CREATE TYPE user_access_level AS ENUM (
    'user', 'manager', 'admin'
);

-- ===== PARTE 4: MIGRAR DADOS ANTIGOS PARA NOVOS =====

-- Mapear departamentos antigos para novos
UPDATE user_permissions SET department = 
CASE 
    WHEN department = 'copy' THEN 'copywriter'
    WHEN department = 'edicao' THEN 'editor'
    WHEN department = 'gestor' THEN 'gestor'
    WHEN department = 'particular' THEN 'particular'
    ELSE 'particular'
END;

-- Migrar additional_departments
UPDATE user_permissions SET additional_departments = 
ARRAY(
    SELECT CASE 
        WHEN unnest_val = 'copy' THEN 'copywriter'
        WHEN unnest_val = 'edicao' THEN 'editor'  
        WHEN unnest_val = 'gestor' THEN 'gestor'
        WHEN unnest_val = 'particular' THEN 'particular'
        ELSE 'particular'
    END
    FROM unnest(additional_departments) AS unnest_val
)
WHERE additional_departments IS NOT NULL AND array_length(additional_departments, 1) > 0;

-- Migrar vault_items.created_by_department
UPDATE vault_items SET created_by_department = 
CASE 
    WHEN created_by_department = 'copy' THEN 'copywriter'
    WHEN created_by_department = 'edicao' THEN 'editor'
    WHEN created_by_department = 'gestor' THEN 'gestor'
    WHEN created_by_department = 'particular' THEN 'particular'
    ELSE 'particular'
END;

-- Migrar vault_items.allowed_departments  
UPDATE vault_items SET allowed_departments = 
ARRAY(
    SELECT CASE 
        WHEN unnest_val = 'copy' THEN 'copywriter'
        WHEN unnest_val = 'edicao' THEN 'editor'
        WHEN unnest_val = 'gestor' THEN 'gestor'
        WHEN unnest_val = 'particular' THEN 'particular'
        ELSE 'particular'
    END
    FROM unnest(allowed_departments) AS unnest_val
)
WHERE allowed_departments IS NOT NULL AND array_length(allowed_departments, 1) > 0;

-- ===== PARTE 5: RECONVERTER PARA ENUM =====

-- Reconverter colunas para usar os novos enums
ALTER TABLE user_permissions 
ALTER COLUMN department TYPE user_department USING department::user_department,
ALTER COLUMN additional_departments TYPE user_department[] USING additional_departments::user_department[];

ALTER TABLE vault_items 
ALTER COLUMN created_by_department TYPE user_department USING created_by_department::user_department,
ALTER COLUMN allowed_departments TYPE user_department[] USING allowed_departments::user_department[];

-- Garantir que visibility_level use o enum correto
ALTER TABLE vault_items 
ALTER COLUMN visibility_level TYPE vault_visibility_level USING 
CASE 
    WHEN visibility_level IS NULL THEN 'personal'::vault_visibility_level
    ELSE visibility_level::vault_visibility_level
END;

-- ===== PARTE 6: RECRIAR CONSTRAINTS E POLÍTICAS =====

-- Função atualizada para verificar permissões
CREATE OR REPLACE FUNCTION can_user_access_vault_item(
    user_uuid UUID, 
    item_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
    user_record RECORD;
    user_dept user_department;
BEGIN
    SELECT * INTO item_record FROM vault_items WHERE id = item_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    IF item_record.user_id = user_uuid THEN RETURN TRUE; END IF;
    
    SELECT * INTO user_record FROM user_permissions WHERE user_id = user_uuid;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    user_dept := user_record.department;
    
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

-- Trigger atualizado
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

-- Recriar trigger
DROP TRIGGER IF EXISTS set_vault_item_department_trigger ON vault_items;
CREATE TRIGGER set_vault_item_department_trigger
    BEFORE INSERT ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION set_vault_item_department();

-- ===== PARTE 7: VERIFICAÇÃO E RESULTADO =====

-- Mostrar resultado da migração
SELECT 'MIGRAÇÃO CONCLUÍDA! Novos departamentos:' as resultado;

SELECT department, COUNT(*) as total 
FROM user_permissions 
GROUP BY department
ORDER BY department;

SELECT 'Verificação dos tipos:' as info;
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'user_permissions' 
AND column_name IN ('department', 'additional_departments');

-- ===== SUCESSO! =====
SELECT '✅ Migração concluída com sucesso!' as status;