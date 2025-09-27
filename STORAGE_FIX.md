# Correção do Upload de Imagens - Swipe File Comments

## Problema
O upload de imagens no sistema de comentários do Swipe File não está funcionando.

## Solução

### 1. Execute o Script SQL no Dashboard do Supabase

Acesse o SQL Editor do Supabase:
https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/sql/new

Execute o script SQL localizado em:
```
scripts/db/054_fix_storage_policies_complete.sql
```

Este script irá:
- Garantir que o bucket `swipe-file-comments` existe e está público
- Remover políticas antigas conflitantes
- Criar políticas simples e permissivas para upload/visualização
- Habilitar RLS na tabela storage.objects

### 2. Verifique as Políticas no Dashboard

Após executar o script, verifique se as políticas foram criadas:
https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/storage/policies

Você deve ver 4 políticas para o bucket `swipe-file-comments`:
- `swipe_comments_auth_upload` - Upload para usuários autenticados
- `swipe_comments_public_view` - Visualização pública
- `swipe_comments_auth_update` - Atualização de arquivos próprios
- `swipe_comments_auth_delete` - Deleção de arquivos próprios

### 3. Teste o Upload

1. Faça login no aplicativo
2. Vá para a página de Swipe Files
3. Clique em uma biblioteca para abrir o modal
4. Tente adicionar um comentário com imagem

### 4. Debug no Console

O código foi atualizado para mostrar logs detalhados no console do navegador:
- Informações do usuário autenticado
- Detalhes do arquivo sendo enviado
- Mensagens de erro específicas

Abra o Console do navegador (F12) para ver os logs durante o upload.

### 5. Tipos de Arquivo Permitidos

O bucket aceita apenas:
- JPEG/JPG
- PNG
- GIF
- WebP
- SVG

Tamanho máximo: 50MB (mas o código limita a 5MB para melhor performance)

### 6. Se Ainda Não Funcionar

1. **Faça logout e login novamente** para renovar a sessão
2. **Verifique se o usuário está aprovado** no sistema
3. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
4. **Execute o script de teste**:
   ```bash
   node scripts/test-image-upload.mjs
   ```

### Arquivos Modificados
- `/components/swipe-file-comments.tsx` - Melhorias no tratamento de erros e logs
- `/scripts/db/054_fix_storage_policies_complete.sql` - Script SQL completo para correção
- `/scripts/test-image-upload.mjs` - Script de teste de upload