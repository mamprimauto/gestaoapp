# 🧹 Guia de Limpeza de Dados

Este documento explica como limpar os dados do sistema de forma segura.

## ⚠️ ATENÇÃO
**A limpeza de dados é uma operação irreversível!** Sempre faça backup antes de executar qualquer limpeza.

## Scripts Disponíveis

### 1. Script Node.js Interativo (Recomendado)
```bash
# Executar o script interativo
node scripts/clean-database.js
```

Este script oferece um menu interativo onde você pode escolher o que limpar:
- Tudo (tarefas, testes A/B, vault)
- Apenas tarefas e comentários
- Apenas testes A/B
- Apenas vault
- Apenas membros (exceto owners)
- Tudo + Membros

### 2. Script SQL Direto
Para usuários avançados que preferem executar SQL diretamente no Supabase:

```bash
# Arquivo: scripts/clean-all-data.sql
```

Abra o Supabase SQL Editor e execute o conteúdo do arquivo.

## Funcionalidades Adicionadas

### Excluir Membros em /equipe
- Administradores agora podem excluir membros diretamente da página /equipe
- Um botão de lixeira aparece ao lado de cada membro (apenas para admins)
- Proteções incluídas:
  - Não permite excluir a própria conta
  - Solicita confirmação antes de excluir
  - Apenas administradores têm acesso

## Ordem de Limpeza

O script limpa os dados na seguinte ordem para respeitar as dependências:

1. **Comentários de tarefas** (task_comments)
2. **Sessões de tempo** (time_tracking_sessions)
3. **Itens de checklist** (task_checklist_items)
4. **Tarefas** (tasks)
5. **Comentários de testes A/B** (ab_test_comments)
6. **Variações de testes A/B** (ab_test_variations)
7. **Testes A/B** (ab_tests)
8. **Produtos do vault** (vault_products)
9. **Membros** (workspace_members) - opcional, mantém owners

## Como Fazer Backup

Antes de limpar, sempre faça backup:

1. Acesse o Supabase Dashboard
2. Vá em Settings > Database
3. Clique em "Backups"
4. Crie um backup manual

## Recuperação de Dados

Se precisar recuperar dados após a limpeza:
1. Acesse os backups no Supabase
2. Restaure o backup mais recente
3. Note que isso reverterá TODAS as mudanças desde o backup

## Troubleshooting

### Erro de permissão
Se receber erro de permissão ao executar o script:
- Verifique se está usando as credenciais corretas
- Para operações administrativas, pode ser necessário usar SUPABASE_SERVICE_ROLE_KEY

### Script não encontra variáveis de ambiente
Certifique-se de que as variáveis estão configuradas:
```bash
export NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
export NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Membros não podem ser excluídos
- Apenas administradores podem excluir membros
- Owners de workspaces não podem ser excluídos pelo script de limpeza

## Segurança

- O script sempre pede confirmação antes de executar
- É necessário digitar "SIM" em maiúsculas para confirmar
- Proteções contra exclusão acidental da própria conta
- Logs detalhados de todas as operações

## Suporte

Em caso de dúvidas ou problemas, consulte a documentação do Supabase ou entre em contato com o suporte técnico.