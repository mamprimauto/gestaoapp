# 🔧 Instruções: Migração Segura do Vault

## 🔍 **Problema Identificado**

A migração anterior falhava porque o banco tinha **dependências complexas** que não podiam ser removidas com `CASCADE`:

- ❌ **5 Políticas RLS ATIVAS** executando em tempo real
- ❌ **Função PL/pgSQL** sendo usada pelas políticas  
- ❌ **Trigger** acessando tabela `user_permissions`
- ❌ **Ordem incorreta** de remoção

## ✅ **Solução Criada**

Criamos uma nova migração **`vault_integration_SAFE.sql`** que:

1. 🔒 **Desabilita RLS** temporariamente para evitar execução de políticas
2. 🗑️ **Remove dependências** na ordem correta: trigger → função → políticas  
3. 🗑️ **Deleta tabela** `user_permissions` sem conflitos
4. 🛡️ **Cria novas políticas** baseadas em `profiles.role`
5. 🔒 **Reabilita RLS** com novo sistema

## 📋 **Como Executar**

### **Passo 1: Backup (Importante!)**
Antes de executar a migração, faça backup:
```sql
-- No Supabase SQL Editor, execute primeiro:
CREATE TABLE vault_backup AS SELECT * FROM vault_items;
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
```

### **Passo 2: Verificar Pré-requisitos**
Certifique-se de que todos os usuários têm perfil na tabela `profiles`:
```sql
-- Verificar se há usuários sem perfil:
SELECT id, email FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles);

-- Se houver, adicione os perfis faltantes:
INSERT INTO profiles (id, email, name, role) 
SELECT id, email, raw_user_meta_data->>'name', 'editor' 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles);
```

### **Passo 3: Executar Migração**
1. Acesse **Supabase SQL Editor**
2. Copie **TODO** o conteúdo do arquivo `vault_integration_SAFE.sql`
3. Cole no SQL Editor
4. Execute a migração completa

### **Passo 4: Verificar Sucesso**
A migração deve terminar com:
```
🎉 ===== MIGRAÇÃO CONCLUÍDA COM SUCESSO! =====
📊 Items no vault: X
👥 Perfis de usuário: Y  
🔧 Políticas RLS criadas: 4
⚠️ Items órfãos (sem profile): 0
```

## 🧪 **Como Testar**

### **Teste 1: Admin (Acesso Total)**
1. Faça login como usuário com `role = 'admin'`
2. Acesse `/vault`
3. ✅ Deve ver **todas** as senhas (próprias + compartilhadas)

### **Teste 2: Editor (Departamental)**  
1. Faça login como usuário com `role = 'editor'`
2. Acesse `/vault`
3. ✅ Deve ver apenas: senhas pessoais + senhas marcadas para "editor"

### **Teste 3: Permissões Granulares**
1. Crie nova senha
2. Selecione "Visibilidade Personalizada" 
3. Marque departamentos específicos (ex: apenas "copywriter")
4. ✅ Apenas usuários desse departamento devem ver a senha

### **Teste 4: Debug Information**
1. No formulário de criar senha
2. Verifique se aparece:
   - `role: admin` (ou outro role correto)
   - `department: administrador` (ou departamento correto)  
   - `can_create_shared: true/false`

## 🔧 **Mapeamento de Roles**

| Role na Equipe (`profiles.role`) | Departamento Vault | Nível Acesso | Pode Criar Compartilhada |
|----------------------------------|-------------------|--------------|-------------------------|
| `admin` | `administrador` | `admin` | ✅ Sim |
| `gestor_trafego` | `gestor` | `manager` | ✅ Sim |
| `editor` | `editor` | `user` | ❌ Não |
| `copywriter` | `copywriter` | `user` | ❌ Não |
| `minerador` | `minerador` | `user` | ❌ Não |

## 🐛 **Se Der Erro**

### **Erro: "Profile não encontrado"**
```sql
-- Verificar usuários sem profile:
SELECT u.id, u.email FROM auth.users u 
LEFT JOIN profiles p ON u.id = p.id 
WHERE p.id IS NULL;

-- Adicionar profiles faltantes:
INSERT INTO profiles (id, email, name, role) 
SELECT id, email, COALESCE(raw_user_meta_data->>'name', email), 'editor' 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles);
```

### **Erro: "Políticas ainda referenciam user_permissions"**
Execute a migração em partes:
```sql
-- 1. Primeiro, apenas remover políticas:
DROP POLICY IF EXISTS "Users can view accessible vault items" ON vault_items;
-- etc...

-- 2. Depois remover função e trigger:
DROP FUNCTION IF EXISTS can_user_access_vault_item(UUID, UUID);
-- etc...

-- 3. Por último, deletar tabela:
DROP TABLE IF EXISTS user_permissions CASCADE;
```

## 📁 **Arquivos a Remover Após Migração**

Depois da migração bem-sucedida, pode deletar:
- ❌ `/app/api/vault/permissions/route.ts` (não é mais usado)
- ❌ `vault_integration_complete.sql` (versão antiga)
- ❌ `EXECUTAR_MIGRACAO_VAULT.sql` (não precisa mais)

## 🎉 **Benefícios Alcançados**

✅ **Sistema unificado**: Vault integrado com `/equipe`  
✅ **Controle granular**: "cada nível de departamento vê determinada senha"  
✅ **Menos complexidade**: Sem tabela `user_permissions`  
✅ **Administração simples**: Mudança de role na equipe afeta vault automaticamente  
✅ **Performance melhor**: Menos JOINs e consultas  
✅ **Segurança mantida**: RLS protege dados corretamente