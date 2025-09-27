-- ===================================================
-- EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- ===================================================
-- 1. Acesse: https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/sql/new
-- 2. Cole todo este conteúdo
-- 3. Clique em "Run" ou pressione Ctrl+Enter
-- ===================================================

-- PARTE 1: CRIAR TABELAS DO VAULT

-- Tabela principal de itens
CREATE TABLE IF NOT EXISTS vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT,
    username TEXT,
    category TEXT DEFAULT 'login',
    favorite BOOLEAN DEFAULT false,
    encrypted_password TEXT NOT NULL,
    encrypted_notes TEXT,
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    strength_score INTEGER DEFAULT 0,
    has_breach BOOLEAN DEFAULT false,
    breach_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS vault_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    auto_lock_minutes INTEGER DEFAULT 5,
    require_master_password BOOLEAN DEFAULT true,
    clipboard_clear_seconds INTEGER DEFAULT 30,
    show_password_strength BOOLEAN DEFAULT true,
    show_breach_warnings BOOLEAN DEFAULT true,
    default_password_length INTEGER DEFAULT 16,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de logs
CREATE TABLE IF NOT EXISTS vault_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vault_item_id UUID REFERENCES vault_items(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    risk_level TEXT DEFAULT 'low',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS vault_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PARTE 2: HABILITAR ROW LEVEL SECURITY

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_sessions ENABLE ROW LEVEL SECURITY;

-- PARTE 3: CRIAR POLÍTICAS DE SEGURANÇA

-- Políticas para vault_items
CREATE POLICY "Users can view own vault items" ON vault_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault items" ON vault_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items" ON vault_items
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault items" ON vault_items
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para vault_settings
CREATE POLICY "Users can view own vault settings" ON vault_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault settings" ON vault_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault settings" ON vault_settings
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para vault_access_logs
CREATE POLICY "Users can view own vault logs" ON vault_access_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault logs" ON vault_access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para vault_sessions
CREATE POLICY "Users can view own vault sessions" ON vault_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault sessions" ON vault_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault sessions" ON vault_sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault sessions" ON vault_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- PARTE 4: CRIAR ÍNDICES PARA PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_vault_items_user ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
CREATE INDEX IF NOT EXISTS idx_vault_items_favorite ON vault_items(favorite);
CREATE INDEX IF NOT EXISTS idx_vault_logs_user ON vault_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_token ON vault_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_expires ON vault_sessions(expires_at);

-- ===================================================
-- PRONTO! Após executar este script:
-- 1. Volte para o aplicativo em /vault
-- 2. Crie uma senha mestre (mínimo 8 caracteres)
-- 3. Comece a adicionar suas senhas com segurança!
-- ===================================================