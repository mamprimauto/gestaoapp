# Time Tracking Migration

## Instruções para executar a migration manualmente

Para habilitar o sistema de cronômetro de tracking de tempo, execute o SQL do arquivo `017_task_time_tracking.sql` no Supabase Dashboard:

### Opção 1: Via Supabase Dashboard
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para o seu projeto
3. Navegue para "SQL Editor"
4. Copie e cole o conteúdo completo do arquivo `017_task_time_tracking.sql`
5. Execute o SQL

### Opção 2: Via Supabase CLI
```bash
# Instalar CLI se necessário
npm install -g supabase

# Fazer login
supabase login

# Aplicar migration
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Opção 3: Copiar SQL Manualmente
Copie e execute o seguinte SQL no seu banco:

```sql
-- Ver conteúdo do arquivo 017_task_time_tracking.sql
```

## Funcionalidades Implementadas

✅ **Tabela `task_time_sessions`** para armazenar sessões de tempo
✅ **APIs RESTful** para gerenciar sessões:
- `POST /api/tasks/[id]/time/start` - Iniciar cronômetro
- `POST /api/tasks/[id]/time/stop` - Parar cronômetro
- `GET /api/tasks/[id]/time/sessions` - Buscar sessões
- `GET /api/tasks/[id]/time/total` - Total de tempo

✅ **Hook `useTimeTracker`** para gerenciar estado
✅ **Componente `TimeTracker`** com interface play/pause
✅ **Integração no modal** de detalhes do criativo
✅ **Persistência local** para recuperar estado após reload
✅ **RLS (Row Level Security)** habilitado

## Como Funciona

1. **Iniciar**: Clique no botão play para começar a rastrear tempo
2. **Pausar**: Clique no botão pause para pausar e salvar a sessão
3. **Continuar**: Clique play novamente para continuar de onde parou
4. **Parar**: Clique no botão stop (quadrado) para resetar tudo

O sistema mantém:
- ⏱️ Tempo da sessão atual
- 📊 Tempo total acumulado de todas as sessões
- 💾 Estado persistido no localStorage e banco de dados
- 🔄 Sincronização automática a cada minuto

## Verificação

Após executar a migration, você deve ver:
- Cronômetro no modal de detalhes do criativo
- Botões de play/pause funcionais
- Display de tempo em formato HH:MM:SS
- Total de tempo acumulado (quando houver)