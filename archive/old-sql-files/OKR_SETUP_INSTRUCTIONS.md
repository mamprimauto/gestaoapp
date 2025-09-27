# Instruções para Configurar Sistema OKR no Supabase

## ⚠️ IMPORTANTE: Execute estes passos para o sistema OKR funcionar corretamente

### Passo 1: Acesse o Supabase Dashboard
1. Vá para [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Execute a Migração SQL
1. Copie TODO o conteúdo do arquivo: `scripts/db/027_okr_system_simplified.sql`
2. Cole no SQL Editor do Supabase
3. Clique em **Run** (botão verde)

### Passo 3: Verifique as Tabelas
Após executar, verifique se as seguintes tabelas foram criadas:
- ✅ `okrs`
- ✅ `key_results`
- ✅ `okr_tasks`
- ✅ `okr_assignees`

Você pode verificar em **Table Editor** no menu lateral.

### Passo 4: Teste o Sistema
1. Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse `/okr` na aplicação
3. Crie um novo OKR
4. Adicione Key Results e Tarefas
5. Verifique se os dados persistem ao recarregar a página

## 🔧 Solução de Problemas

### Erro: "Tabelas não encontradas"
- Execute novamente o SQL no Supabase Dashboard
- Verifique se não há erros na execução

### Erro: "Permissão negada"
- As políticas RLS estão simplificadas para permitir todos os usuários autenticados
- Certifique-se de estar logado na aplicação

### Dados não persistem
1. Verifique no Supabase Dashboard > Table Editor se os dados estão sendo salvos
2. Se sim, pode ser problema de cache - limpe o cache do navegador
3. Se não, verifique os logs do console para erros

### Sincronização em tempo real não funciona
1. Verifique se o Realtime está habilitado para as tabelas:
   - Vá para Database > Replication
   - Habilite para: `okrs`, `key_results`, `okr_tasks`, `okr_assignees`

## 📝 SQL Alternativo (Se houver problemas)

Se o arquivo simplificado não funcionar, você pode executar este SQL mínimo:

```sql
-- Criar apenas as tabelas básicas
CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  focus TEXT,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target INTEGER DEFAULT 0,
  current INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE okr_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  assignee_id UUID,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE okr_assignees (
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key_result_id, user_id)
);

-- Desabilitar RLS temporariamente para testes
ALTER TABLE okrs DISABLE ROW LEVEL SECURITY;
ALTER TABLE key_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE okr_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE okr_assignees DISABLE ROW LEVEL SECURITY;
```

## ✅ Confirmação

Após seguir todos os passos, o sistema OKR deve estar funcionando com:
- ✅ Criação, edição e exclusão de OKRs
- ✅ Gerenciamento de Key Results
- ✅ Controle de tarefas com status
- ✅ Atribuição de responsáveis
- ✅ Navegação por semanas
- ✅ Persistência de dados
- ✅ Sincronização em tempo real entre usuários

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do Supabase em Functions > Logs
3. Confirme que as tabelas existem no Table Editor
4. Teste criar dados diretamente no Table Editor para validar permissões