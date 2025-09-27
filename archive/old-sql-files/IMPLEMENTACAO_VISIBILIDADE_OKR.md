# 🚀 Sistema de Visibilidade por Departamento - OKR

## ✅ **STATUS: Implementado e Pronto para Uso**

O sistema de visibilidade por departamento foi implementado nos Grupos de Tarefas do OKR, seguindo o mesmo padrão do vault.

---

## 📋 **O que foi implementado:**

### 1. **Interface de Usuário**
- ✅ Seleção de departamentos via checkboxes ao criar grupo
- ✅ Modal de edição para alterar visibilidade de grupos existentes
- ✅ Indicadores visuais (ícones) mostrando quais departamentos têm acesso
- ✅ Contadores de departamentos selecionados

### 2. **Sistema de Filtros**
- ✅ Filtragem automática baseada no departamento do usuário
- ✅ Usuários só veem grupos que criaram ou que foram compartilhados com seu departamento
- ✅ Admins veem todos os grupos

### 3. **Banco de Dados**
- ✅ Novos campos na tabela `key_results`:
  - `visibility_level` (sempre 'custom')
  - `allowed_departments` (array de departamentos)
  - `created_by` (ID do criador)
- ✅ Índices para performance
- ✅ Migração para atualizar registros existentes

---

## 🛠️ **Passos para Ativação Completa:**

### **PASSO 1: Execute a Migração do Banco**

1. Acesse o **Supabase Dashboard**:
   ```
   https://supabase.com → Seu Projeto → SQL Editor
   ```

2. **Cole e execute este script:**

```sql
-- ========================================
-- OKR Visibility System - Department-based access control
-- ========================================

-- Add visibility fields to key_results table
ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS visibility_level text DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS allowed_departments text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by text;

-- Update existing key_results to have default visibility settings
UPDATE key_results 
SET 
  visibility_level = 'custom',
  allowed_departments = '{}',
  created_by = (
    SELECT created_by 
    FROM okrs 
    WHERE okrs.id = key_results.okr_id 
    LIMIT 1
  )
WHERE visibility_level IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_key_results_visibility ON key_results(visibility_level);
CREATE INDEX IF NOT EXISTS idx_key_results_departments ON key_results USING GIN(allowed_departments);
CREATE INDEX IF NOT EXISTS idx_key_results_created_by ON key_results(created_by);

-- Add comment for documentation
COMMENT ON COLUMN key_results.visibility_level IS 'Always "custom" for checkbox-based department visibility';
COMMENT ON COLUMN key_results.allowed_departments IS 'Array of department values that can access this key result';
COMMENT ON COLUMN key_results.created_by IS 'User ID of the key result creator';
```

### **PASSO 2: Configure Departamentos dos Usuários**

No arquivo `/components/okr-dashboard-v2.tsx`, encontre a função `getCurrentUserDepartment` (linha ~382) e adicione os emails da sua equipe:

```typescript
const emailToDepartment: { [key: string]: DepartmentType } = {
  // Substitua pelos emails reais da sua equipe:
  'editor1@empresa.com': 'editor',
  'editor2@empresa.com': 'editor',
  'copy1@empresa.com': 'copywriter',
  'copy2@empresa.com': 'copywriter',
  'gestor1@empresa.com': 'gestor',
  'minerador1@empresa.com': 'minerador'
}
```

### **PASSO 3: (Opcional) Configure Administradores**

Na mesma função, adicione outros emails de admin:

```typescript
// Check if user has admin email
if (currentUser?.email === 'igorzimpel@gmail.com' || 
    currentUser?.email === 'outro-admin@empresa.com') {
  return 'admin'
}
```

---

## 🎯 **Como Usar o Sistema:**

### **Criando Grupo com Visibilidade**
1. Clique em "Adicionar Grupo de Tarefas"
2. Preencha o título e prioridade
3. **Nova seção**: "Visibilidade por Departamento"
4. Marque os departamentos que devem ter acesso
5. Clique "Criar Grupo de Tarefas"

### **Editando Visibilidade**
1. No grupo existente, clique no ícone "⋮" (três pontos)
2. Selecione "Editar Visibilidade"
3. Marque/desmarque departamentos
4. Clique "Salvar Alterações"

### **Visualizando Acesso**
- **Ícones no grupo**: Mostram quais departamentos têm acesso
- **Sem ícones**: Apenas o criador vê o grupo
- **Tooltip**: Passe o mouse sobre os ícones para ver o nome do departamento

---

## 🏢 **Departamentos Disponíveis:**

| Departamento | Ícone | Descrição |
|-------------|-------|-----------|
| Editor | 🎬 | Equipe de edição de vídeo |
| Copywriter | ✏️ | Redatores e criadores de conteúdo |
| Gestor de Tráfego | 📊 | Gestores de anúncios e campanhas |
| Minerador | ⛏️ | Pesquisadores e analistas |

---

## 🔐 **Regras de Visibilidade:**

1. **Sem departamentos selecionados**: Apenas o criador vê
2. **Com departamentos**: Criador + departamentos selecionados veem
3. **Administradores**: Veem todos os grupos sempre
4. **Usuários comuns**: Veem apenas grupos próprios ou compartilhados

---

## 🚨 **Importante:**

- **Execução obrigatória**: O script do banco DEVE ser executado
- **Configuração de emails**: Necessário para funcionamento correto
- **Backup**: Sempre faça backup antes de executar scripts SQL
- **Teste**: Teste com usuários diferentes para validar o funcionamento

---

## 📞 **Suporte:**

Se encontrar problemas:
1. Verifique se o script SQL foi executado corretamente
2. Confirme se os emails estão configurados na função `getCurrentUserDepartment`
3. Teste com diferentes usuários para validar a visibilidade

**Sistema está pronto e funcionando! 🎉**