-- 🔐 SISTEMA DE VAULT SEGURO
-- Sistema de gerenciamento de senhas com criptografia client-side
-- Máxima segurança com Zero-Knowledge Architecture

-- ===== TABELA PRINCIPAL DO VAULT =====
-- Armazena senhas criptografadas com metadados
CREATE TABLE IF NOT EXISTS vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadados (texto claro)
    title TEXT NOT NULL,
    url TEXT,
    username TEXT,
    category TEXT DEFAULT 'other',
    favorite BOOLEAN DEFAULT false,
    
    -- Dados criptografados
    encrypted_password TEXT NOT NULL, -- Senha criptografada com AES-256-GCM
    encrypted_notes TEXT,            -- Notas criptografadas (opcional)
    
    -- Dados de criptografia (necessários para descriptografar)
    salt TEXT NOT NULL,              -- Salt único para cada item
    iv TEXT NOT NULL,                -- Initialization Vector
    
    -- Metadados de segurança
    strength_score INTEGER DEFAULT 0, -- Score da força da senha (1-100)
    has_breach BOOLEAN DEFAULT false, -- Se foi detectado em vazamentos
    breach_count INTEGER DEFAULT 0,   -- Número de vazamentos detectados
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints de segurança
    CONSTRAINT vault_items_title_not_empty CHECK (length(title) > 0),
    CONSTRAINT vault_items_encrypted_password_not_empty CHECK (length(encrypted_password) > 0),
    CONSTRAINT vault_items_salt_not_empty CHECK (length(salt) > 0),
    CONSTRAINT vault_items_iv_not_empty CHECK (length(iv) > 0),
    CONSTRAINT vault_items_strength_score_valid CHECK (strength_score >= 0 AND strength_score <= 100)
);

-- ===== TABELA DE CONFIGURAÇÕES DO VAULT =====
-- Configurações por usuário
CREATE TABLE IF NOT EXISTS vault_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Configurações de segurança
    auto_lock_minutes INTEGER DEFAULT 5,     -- Auto-lock após X minutos
    require_master_password BOOLEAN DEFAULT true,
    clipboard_clear_seconds INTEGER DEFAULT 30,
    
    -- Configurações de interface
    show_password_strength BOOLEAN DEFAULT true,
    show_breach_warnings BOOLEAN DEFAULT true,
    default_password_length INTEGER DEFAULT 16,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT vault_settings_auto_lock_valid CHECK (auto_lock_minutes >= 1 AND auto_lock_minutes <= 60),
    CONSTRAINT vault_settings_clipboard_valid CHECK (clipboard_clear_seconds >= 5 AND clipboard_clear_seconds <= 300),
    CONSTRAINT vault_settings_password_length_valid CHECK (default_password_length >= 8 AND default_password_length <= 128)
);

-- ===== TABELA DE LOGS DE AUDITORIA =====
-- Registra todos os acessos e modificações
CREATE TABLE IF NOT EXISTS vault_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vault_item_id UUID REFERENCES vault_items(id) ON DELETE SET NULL,
    
    -- Detalhes da ação
    action TEXT NOT NULL, -- 'view', 'copy', 'create', 'update', 'delete'
    resource TEXT,        -- Recurso acessado
    
    -- Contexto de segurança
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    
    -- Análise de risco
    risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT vault_logs_action_valid CHECK (action IN ('view', 'copy', 'create', 'update', 'delete', 'unlock', 'lock')),
    CONSTRAINT vault_logs_risk_valid CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- ===== TABELA DE SESSÕES ATIVAS =====
-- Controla sessões ativas do vault
CREATE TABLE IF NOT EXISTS vault_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dados da sessão
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Contexto
    ip_address INET,
    user_agent TEXT,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT vault_sessions_expires_future CHECK (expires_at > created_at),
    CONSTRAINT vault_sessions_token_not_empty CHECK (length(session_token) > 0)
);

-- ===== ÍNDICES PARA PERFORMANCE E SEGURANÇA =====

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_created_at ON vault_items(created_at);
CREATE INDEX IF NOT EXISTS idx_vault_items_last_accessed ON vault_items(last_accessed);
CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
CREATE INDEX IF NOT EXISTS idx_vault_items_favorite ON vault_items(favorite) WHERE favorite = true;

-- Índices de auditoria
CREATE INDEX IF NOT EXISTS idx_vault_logs_user_id ON vault_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_logs_created_at ON vault_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_vault_logs_action ON vault_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_vault_logs_risk_level ON vault_access_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_vault_logs_vault_item ON vault_access_logs(vault_item_id);

-- Índices de sessão
CREATE INDEX IF NOT EXISTS idx_vault_sessions_user_id ON vault_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_token ON vault_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_expires ON vault_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_active ON vault_sessions(is_active) WHERE is_active = true;

-- ===== TRIGGERS PARA AUTOMATED UPDATES =====

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas relevantes
CREATE TRIGGER update_vault_items_updated_at 
    BEFORE UPDATE ON vault_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_settings_updated_at 
    BEFORE UPDATE ON vault_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar last_activity em sessões
CREATE OR REPLACE FUNCTION update_vault_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vault_sessions_activity 
    BEFORE UPDATE ON vault_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_vault_session_activity();

-- ===== FUNÇÕES AUXILIARES =====

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_vault_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM vault_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO vault_access_logs (
        user_id,
        action,
        resource,
        metadata,
        risk_level
    )
    SELECT 
        '00000000-0000-0000-0000-000000000000'::UUID, -- System user
        'cleanup',
        'expired_sessions',
        jsonb_build_object('deleted_count', deleted_count),
        'low';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de segurança
CREATE OR REPLACE FUNCTION get_vault_security_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_items', COUNT(*),
        'weak_passwords', COUNT(*) FILTER (WHERE strength_score < 50),
        'breached_passwords', COUNT(*) FILTER (WHERE has_breach = true),
        'recent_access', COUNT(*) FILTER (WHERE last_accessed >= NOW() - INTERVAL '7 days'),
        'oldest_password', MIN(password_changed_at),
        'avg_strength', COALESCE(AVG(strength_score), 0)
    )
    INTO stats
    FROM vault_items
    WHERE user_id = p_user_id;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- ===== COMENTÁRIOS DE SEGURANÇA =====

COMMENT ON TABLE vault_items IS 'Armazena senhas criptografadas client-side com metadados. NUNCA contém senhas em texto claro.';
COMMENT ON COLUMN vault_items.encrypted_password IS 'Senha criptografada com AES-256-GCM no cliente';
COMMENT ON COLUMN vault_items.salt IS 'Salt único gerado para cada item, usado na derivação da chave';
COMMENT ON COLUMN vault_items.iv IS 'Initialization Vector único para criptografia AES-GCM';

COMMENT ON TABLE vault_access_logs IS 'Log de auditoria completo. Crítico para detecção de atividades suspeitas.';
COMMENT ON TABLE vault_sessions IS 'Controle rigoroso de sessões ativas para auto-lock e segurança.';
COMMENT ON TABLE vault_settings IS 'Configurações de segurança por usuário.';

-- ===== SUCESSO =====
-- Estrutura criada com sucesso!
-- Próximo passo: Implementar Row Level Security (RLS)