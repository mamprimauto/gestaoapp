# Configuração Manual das Políticas de Storage

## ⚠️ Problema
Não é possível criar políticas RLS via SQL devido a restrições de permissão no Supabase.

## ✅ Solução: Configurar via Dashboard

### Passo 1: Execute o Script SQL
Execute o script `057_bucket_only.sql` no SQL Editor para criar o bucket:
https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/sql/new

### Passo 2: Configure as Políticas no Dashboard

1. **Acesse o Storage Policies:**
   https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/storage/policies

2. **Clique em "New Policy" para o bucket `swipe-file-comments`**

3. **Crie 4 políticas:**

#### Política 1: Upload (INSERT)
- **Nome:** `Allow authenticated uploads`
- **Operação:** INSERT
- **Roles:** authenticated
- **Policy:**
```sql
bucket_id = 'swipe-file-comments'
```

#### Política 2: Visualização (SELECT)
- **Nome:** `Allow public viewing`
- **Operação:** SELECT
- **Roles:** public
- **Policy:**
```sql
bucket_id = 'swipe-file-comments'
```

#### Política 3: Atualização (UPDATE)
- **Nome:** `Allow users to update own files`
- **Operação:** UPDATE
- **Roles:** authenticated
- **Check:**
```sql
bucket_id = 'swipe-file-comments' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Política 4: Deleção (DELETE)
- **Nome:** `Allow users to delete own files`
- **Operação:** DELETE
- **Roles:** authenticated
- **Policy:**
```sql
bucket_id = 'swipe-file-comments' AND auth.uid()::text = (storage.foldername(name))[1]
```

## 🚀 Alternativa Simples: Usar Bucket Público

Como o bucket já está configurado como **público**, você pode:

1. **Não criar políticas RLS** - o bucket funcionará sem elas
2. **Qualquer pessoa poderá ver as imagens** (que é o comportamento desejado)
3. **Upload ainda requer autenticação** (comportamento padrão do Supabase)

## 🧪 Teste

Após configurar:
1. Faça logout e login no app
2. Vá para Swipe Files
3. Abra uma biblioteca
4. Tente adicionar um comentário com imagem

## 📝 Notas

- O bucket público permite que qualquer pessoa veja as imagens (sem necessidade de autenticação)
- Upload sempre requer autenticação no Supabase
- Se o upload funcionar sem políticas, você não precisa criá-las