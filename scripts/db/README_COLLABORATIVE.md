# 🚀 Migração para Plataforma Colaborativa

Este guia explica como executar a migração para transformar a plataforma de individual para colaborativa (como Monday/ClickUp).

## 📋 Scripts SQL para Execução

Execute os scripts na ordem abaixo no painel SQL do Supabase Dashboard:

### 1. Criar Estrutura de Organizações
```sql
-- Execute: scripts/db/018_organizations.sql
```
Este script cria:
- Tabela `organizations` 
- Tabela `organization_members`
- Políticas RLS para organizações
- Função para criar organização padrão

### 2. Adicionar organization_id às Tasks
```sql
-- Execute: scripts/db/019_tasks_add_organization.sql
```
Este script:
- Adiciona coluna `organization_id` à tabela `tasks`
- Cria função de migração
- Atualiza políticas RLS das tasks para acesso colaborativo

### 3. Atualizar Políticas das Tabelas Relacionadas
```sql
-- Execute: scripts/db/020_collaborative_policies.sql
```
Este script atualiza políticas RLS para:
- `task_comments` - Membros da organização podem ver/comentar
- `task_files` - Membros podem acessar arquivos das tasks
- `task_time_sessions` - Cada usuário vê seu tempo + estatísticas gerais
- `profiles` - Membros veem profiles da mesma organização

## ⚡ Executar Migração dos Dados

Após executar os 3 scripts acima, execute esta função para migrar dados existentes:

```sql
-- Criar organizações padrão e migrar tasks existentes
SELECT public.execute_tasks_migration();
```

## ✨ Resultado Final

Após a migração:
- ✅ Todos os usuários veem as mesmas tasks/criativos
- ✅ Cada task mostra "criado por" e "responsável" separadamente  
- ✅ Sistema colaborativo funcional
- ✅ Dados existentes preservados
- ✅ Compatibilidade com funcionalidades atuais

## 🔧 Frontend Atualizado

As seguintes alterações já foram feitas no código:
- `TaskDataProvider` busca tasks da organização
- Componentes mostram informações colaborativas
- Suporte a organização em novas tasks
- Real-time para mudanças da organização

## 🎯 Próximos Passos (Opcional)

1. **Sistema de Convites**: Permitir admins convidarem usuários
2. **Gestão de Organizações**: Interface para criar/gerenciar organizações
3. **Roles Avançados**: Diferentes permissões por tipo de usuário
4. **Multi-organização**: Usuários pertencerem a múltiplas organizações

## ⚠️ Importante

- Execute os scripts em ambiente de desenvolvimento primeiro
- Faça backup do banco antes da migração em produção
- Teste todas as funcionalidades após a migração
- Os usuários precisarão fazer logout/login para ver as mudanças