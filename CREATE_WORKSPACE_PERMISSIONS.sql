-- ========================================================
-- CRIAR SISTEMA DE PERMISSÕES POR WORKSPACE
-- ========================================================

-- 1. Criar tabela de permissões
CREATE TABLE IF NOT EXISTS public.workspace_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(workspace_id)
);

-- 2. Inserir permissões padrão (todos podem acessar inicialmente)
INSERT INTO public.workspace_permissions (workspace_id, allowed_roles) 
VALUES 
  ('copy', ARRAY['admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador']),
  ('edicao', ARRAY['admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador']),
  ('trafego', ARRAY['admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador']),
  ('igor', ARRAY['admin']), -- Apenas admin pode acessar área do Igor
  ('italo', ARRAY['admin']) -- Apenas admin pode acessar área do Italo
ON CONFLICT (workspace_id) DO NOTHING;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_workspace_permissions_workspace_id 
ON public.workspace_permissions(workspace_id);

-- 4. Garantir permissões de acesso
GRANT ALL ON public.workspace_permissions TO authenticated;
GRANT ALL ON public.workspace_permissions TO anon;
GRANT ALL ON public.workspace_permissions TO service_role;

-- 5. Verificar resultado
SELECT 
  workspace_id,
  allowed_roles,
  array_length(allowed_roles, 1) as num_roles_permitidos,
  created_at
FROM public.workspace_permissions
ORDER BY workspace_id;

-- ========================================================
-- RESULTADO ESPERADO:
-- - Tabela criada com permissões
-- - Todos os departamentos com acesso total inicialmente
-- - Áreas pessoais (igor/italo) restritas a admin
-- ========================================================