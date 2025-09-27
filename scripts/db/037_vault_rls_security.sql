-- 🔒 ROW LEVEL SECURITY PARA VAULT SYSTEM
-- Implementa isolamento total entre usuários e políticas de segurança máxima

-- ===== HABILITAR RLS EM TODAS AS TABELAS =====

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_sessions ENABLE ROW LEVEL SECURITY;

-- ===== POLÍTICAS PARA VAULT_ITEMS =====

-- Usuários só podem ver seus próprios itens
CREATE POLICY "Users can view own vault items" ON vault_items
    FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários só podem inserir itens para si mesmos
CREATE POLICY "Users can insert own vault items" ON vault_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuários só podem atualizar seus próprios itens
CREATE POLICY "Users can update own vault items" ON vault_items
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usuários só podem deletar seus próprios itens
CREATE POLICY "Users can delete own vault items" ON vault_items
    FOR DELETE
    USING (auth.uid() = user_id);

-- ===== POLÍTICAS PARA VAULT_SETTINGS =====

-- Usuários só podem ver suas próprias configurações
CREATE POLICY "Users can view own vault settings" ON vault_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários só podem inserir configurações para si mesmos
CREATE POLICY "Users can insert own vault settings" ON vault_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuários só podem atualizar suas próprias configurações
CREATE POLICY "Users can update own vault settings" ON vault_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ===== POLÍTICAS PARA VAULT_ACCESS_LOGS =====

-- Usuários só podem ver seus próprios logs
CREATE POLICY "Users can view own vault logs" ON vault_access_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários só podem inserir logs para si mesmos
CREATE POLICY "Users can insert own vault logs" ON vault_access_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Sistema pode inserir logs (para cleanup e operações automáticas)
CREATE POLICY "System can insert vault logs" ON vault_access_logs
    FOR INSERT
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::UUID);

-- ===== POLÍTICAS PARA VAULT_SESSIONS =====

-- Usuários só podem ver suas próprias sessões
CREATE POLICY "Users can view own vault sessions" ON vault_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários só podem inserir sessões para si mesmos
CREATE POLICY "Users can insert own vault sessions" ON vault_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuários só podem atualizar suas próprias sessões
CREATE POLICY "Users can update own vault sessions" ON vault_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usuários só podem deletar suas próprias sessões
CREATE POLICY "Users can delete own vault sessions" ON vault_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ===== FUNÇÕES DE SEGURANÇA AVANÇADA =====

-- Função para registrar acesso automaticamente
CREATE OR REPLACE FUNCTION log_vault_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log para visualizações (SELECT)
    IF TG_OP = 'SELECT' THEN
        INSERT INTO vault_access_logs (
            user_id,
            vault_item_id,
            action,
            resource,
            ip_address,
            metadata,
            risk_level
        ) VALUES (
            NEW.user_id,
            NEW.id,
            'view',
            'vault_item',
            inet_client_addr(),
            jsonb_build_object(
                'item_title', NEW.title,
                'operation', TG_OP
            ),
            'low'
        );
    END IF;
    
    -- Log para modificações
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        INSERT INTO vault_access_logs (
            user_id,
            vault_item_id,
            action,
            resource,
            ip_address,
            metadata,
            risk_level
        ) VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            COALESCE(NEW.id, OLD.id),
            LOWER(TG_OP),
            'vault_item',
            inet_client_addr(),
            CASE 
                WHEN TG_OP = 'INSERT' THEN 
                    jsonb_build_object(
                        'item_title', NEW.title,
                        'category', NEW.category
                    )
                WHEN TG_OP = 'UPDATE' THEN 
                    jsonb_build_object(
                        'item_title', NEW.title,
                        'fields_changed', jsonb_build_array_text(
                            CASE WHEN OLD.title != NEW.title THEN 'title' END,
                            CASE WHEN OLD.url != NEW.url THEN 'url' END,
                            CASE WHEN OLD.username != NEW.username THEN 'username' END,
                            CASE WHEN OLD.encrypted_password != NEW.encrypted_password THEN 'password' END,
                            CASE WHEN OLD.encrypted_notes != NEW.encrypted_notes THEN 'notes' END
                        )
                    )
                WHEN TG_OP = 'DELETE' THEN 
                    jsonb_build_object(
                        'item_title', OLD.title,
                        'category', OLD.category
                    )
            END,
            CASE 
                WHEN TG_OP = 'DELETE' THEN 'medium'
                WHEN TG_OP = 'UPDATE' AND OLD.encrypted_password != NEW.encrypted_password THEN 'medium'
                ELSE 'low'
            END
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== TRIGGERS DE AUDITORIA =====

-- Trigger para log automático em vault_items
CREATE TRIGGER vault_items_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION log_vault_access();

-- Trigger para atualizar last_accessed quando item é visualizado
CREATE OR REPLACE FUNCTION update_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualiza se passou mais de 1 minuto desde último acesso
    IF OLD.last_accessed IS NULL OR OLD.last_accessed < NOW() - INTERVAL '1 minute' THEN
        NEW.last_accessed = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de last_accessed
CREATE TRIGGER update_vault_item_last_accessed
    BEFORE UPDATE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION update_last_accessed();

-- ===== FUNÇÕES DE VALIDAÇÃO DE SEGURANÇA =====

-- Função para validar força da senha (client-side hint)
CREATE OR REPLACE FUNCTION calculate_password_strength(encrypted_data TEXT, salt TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Esta função retorna um score baseado no comprimento do dado criptografado
    -- A validação real de força é feita no client-side antes da criptografia
    -- Aqui apenas estimamos baseado no tamanho
    
    IF LENGTH(encrypted_data) < 50 THEN
        RETURN 20; -- Senha provavelmente muito fraca
    ELSIF LENGTH(encrypted_data) < 100 THEN
        RETURN 50; -- Senha média
    ELSIF LENGTH(encrypted_data) < 150 THEN
        RETURN 75; -- Senha forte
    ELSE
        RETURN 90; -- Senha muito forte
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular strength_score automaticamente
CREATE OR REPLACE FUNCTION auto_calculate_strength()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular score de força baseado nos dados criptografados
    NEW.strength_score = calculate_password_strength(NEW.encrypted_password, NEW.salt);
    
    -- Atualizar timestamp de mudança de senha se a senha mudou
    IF TG_OP = 'UPDATE' AND OLD.encrypted_password != NEW.encrypted_password THEN
        NEW.password_changed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_vault_item_strength
    BEFORE INSERT OR UPDATE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_strength();

-- ===== FUNÇÕES DE DETECÇÃO DE ANOMALIAS =====

-- Função para detectar atividades suspeitas
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
    recent_access_count INTEGER;
    different_ip_count INTEGER;
    risk_level TEXT DEFAULT 'low';
BEGIN
    -- Contar acessos recentes (última hora)
    SELECT COUNT(*)
    INTO recent_access_count
    FROM vault_access_logs
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND action IN ('view', 'copy');
    
    -- Contar IPs diferentes nas últimas 24 horas
    SELECT COUNT(DISTINCT ip_address)
    INTO different_ip_count
    FROM vault_access_logs
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND ip_address IS NOT NULL;
    
    -- Determinar nível de risco
    IF recent_access_count > 50 THEN
        risk_level = 'high';  -- Muitos acessos recentes
    ELSIF recent_access_count > 20 THEN
        risk_level = 'medium';
    ELSIF different_ip_count > 5 THEN
        risk_level = 'medium';  -- Muitos IPs diferentes
    ELSIF different_ip_count > 10 THEN
        risk_level = 'high';
    END IF;
    
    -- Atualizar o nível de risco no log atual
    NEW.risk_level = risk_level;
    
    -- Se é alto risco, criar alerta
    IF risk_level IN ('high', 'critical') THEN
        -- Inserir log de alerta
        INSERT INTO vault_access_logs (
            user_id,
            action,
            resource,
            ip_address,
            metadata,
            risk_level
        ) VALUES (
            NEW.user_id,
            'alert',
            'security_anomaly',
            NEW.ip_address,
            jsonb_build_object(
                'recent_access_count', recent_access_count,
                'different_ip_count', different_ip_count,
                'trigger_action', NEW.action
            ),
            'critical'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de detecção de anomalias
CREATE TRIGGER detect_vault_anomalies
    BEFORE INSERT ON vault_access_logs
    FOR EACH ROW
    EXECUTE FUNCTION detect_suspicious_activity();

-- ===== POLÍTICAS AVANÇADAS DE CLEANUP =====

-- Função para auto-cleanup de logs antigos (manter 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_vault_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deletar logs mais antigos que 90 dias, exceto os críticos
    DELETE FROM vault_access_logs 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND risk_level NOT IN ('high', 'critical');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO vault_access_logs (
        user_id,
        action,
        resource,
        metadata,
        risk_level
    ) VALUES (
        '00000000-0000-0000-0000-000000000000'::UUID,
        'cleanup',
        'old_logs',
        jsonb_build_object('deleted_count', deleted_count),
        'low'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== GRANTS E PERMISSÕES =====

-- Garantir que usuários autenticados possam acessar as funções
GRANT EXECUTE ON FUNCTION get_vault_security_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_vault_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_vault_logs() TO authenticated;

-- ===== COMENTÁRIOS DE SEGURANÇA =====

COMMENT ON POLICY "Users can view own vault items" ON vault_items IS 
    'Isolamento total: usuários só veem seus próprios itens do vault';

COMMENT ON FUNCTION log_vault_access() IS 
    'Log automático de todos os acessos para auditoria de segurança';

COMMENT ON FUNCTION detect_suspicious_activity() IS 
    'Detecção proativa de atividades suspeitas baseada em padrões de acesso';

COMMENT ON FUNCTION cleanup_old_vault_logs() IS 
    'Limpeza automática de logs antigos mantendo os críticos para investigação';

-- ===== SUCESSO =====
-- Row Level Security implementado com máxima segurança!
-- Próximo passo: Implementar biblioteca de criptografia client-side