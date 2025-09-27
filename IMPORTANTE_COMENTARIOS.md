# SOLUÇÃO PARA COMENTÁRIOS

## Problema Identificado
Os comentários não estão funcionando devido a:
1. **Políticas RLS desatualizadas** - As políticas estavam esperando organizações que não existem
2. **Query incompleta** - Não estava buscando os dados do usuário junto com os comentários
3. **Sessão não existe** - Sem login, não há userId para adicionar comentários

## Passos para Resolver

### 1. Execute o SQL no Supabase Dashboard
Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- Arquivo: scripts/db/050_fix_comments_collaborative.sql
-- Este arquivo corrige as políticas RLS para funcionar no modo colaborativo

-- Copie e execute todo o conteúdo do arquivo acima no Supabase SQL Editor
```

### 2. Faça Login no Sistema
**IMPORTANTE**: Você precisa estar logado para adicionar comentários!
- Acesse `/login` 
- Entre com suas credenciais
- O sistema precisa de um userId válido para funcionar

### 3. Teste os Comentários
1. Abra uma tarefa no kanban
2. Digite um comentário
3. Clique em "Enviar"
4. O comentário deve aparecer imediatamente com seu nome

## Debug Adicionado
Abra o console do navegador (F12) para ver os logs de debug:
- `🔍 MODAL DEBUG` - Mostra dados da tarefa e comentários
- `💬 DEBUG - handleAddComment` - Mostra o processo de adicionar comentário  
- `📝 DEBUG addComment` - Mostra a inserção no banco de dados
- `🔐 AUTH DEBUG` - Mostra informações de autenticação

## Verificação da Sessão
Se você ver "no session" nos logs:
1. Você não está logado
2. Acesse `/login` e faça login
3. Recarregue a página

## Estrutura dos Comentários
Cada comentário agora inclui:
- `id` - ID único do comentário
- `content` - Texto do comentário
- `created_at` - Data/hora de criação
- `user` - Objeto com dados do usuário:
  - `id` - ID do usuário
  - `name` - Nome do usuário
  - `email` - Email do usuário
  - `avatar_url` - URL do avatar

## Alterações Realizadas

### 1. task-data.tsx
- Query de tarefas agora inclui join com profiles para trazer dados do usuário
- Função addComment atualiza a tarefa local após adicionar comentário
- Debug logs adicionados para troubleshooting

### 2. kanban-task-modal.tsx  
- Usa `currentTask` do contexto ao invés do prop `task` para dados atualizados
- Fallback para email se nome não existir
- Debug logs ao abrir modal

### 3. Novo arquivo SQL
- `/scripts/db/050_fix_comments_collaborative.sql` - Políticas RLS simplificadas

## Próximos Passos
1. Execute o SQL no Supabase
2. Faça login no sistema
3. Teste adicionar comentários
4. Verifique o console para debug se houver problemas