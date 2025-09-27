# 🔍 Guia de Debug - Sistema Colaborativo

## Mudanças Implementadas

### 1. Logs de Debug no TaskDataProvider
- Adicionados console.logs mostrando:
  - User ID ao fazer login
  - Organization ID ao buscar organização
  - Quantidade de tasks encontradas
  - Organization ID ao criar nova task
  - Eventos real-time recebidos

### 2. Indicador Visual no Sidebar
- Mostra nome e ID da organização
- Exibe total de tasks visíveis
- Ajuda a identificar rapidamente se usuários estão na mesma org

### 3. Script SQL de Verificação
- Criado arquivo `scripts/verify_collaboration.sql`
- Execute no Supabase para verificar integridade dos dados

## Como Verificar se está Funcionando

### Passo 1: Abrir Console do Navegador
1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Recarregue a página

### Passo 2: Verificar Logs
Você deve ver logs como:
```
[TaskDataProvider] User ID: abc123...
[TaskDataProvider] Organization ID: def456...
[TaskDataProvider] Buscando tasks da organização...
[TaskDataProvider] Tasks encontradas: 15
[TaskDataProvider] Total de tasks carregadas: 15
```

### Passo 3: Verificar Sidebar
No rodapé do sidebar, você verá:
- `Org: Minha Organização (def456...)`
- `Tasks visíveis: 15`

### Passo 4: Testar com Dois Usuários
1. Abra duas abas anônimas diferentes
2. Faça login com usuários diferentes
3. Ambos devem mostrar:
   - Mesmo Organization ID no sidebar
   - Mesmo número de tasks visíveis
   - Mesmas tasks na lista

### Passo 5: Criar Nova Task
1. Crie uma task em um usuário
2. Verifique no console: `[TaskDataProvider] Criando task com organization_id: def456...`
3. A task deve aparecer instantaneamente no outro usuário
4. Console do outro usuário: `[TaskDataProvider] Real-time event: INSERT task_id: xyz789...`

## Troubleshooting

### Problema: Usuários veem diferentes Organization IDs
**Solução**: Execute no Supabase SQL Editor:
```sql
-- Verificar organizações dos usuários
SELECT 
  au.email,
  om.organization_id,
  o.name as org_name
FROM auth.users au
JOIN public.organization_members om ON au.id = om.user_id
JOIN public.organizations o ON om.organization_id = o.id
WHERE au.email IN ('usuario1@email.com', 'usuario2@email.com');
```

### Problema: Tasks sem organization_id
**Solução**: Execute no Supabase SQL Editor:
```sql
-- Verificar tasks sem organização
SELECT COUNT(*) as tasks_sem_org FROM public.tasks WHERE organization_id IS NULL;

-- Se houver tasks sem org, migrar:
UPDATE public.tasks t
SET organization_id = (
  SELECT om.organization_id 
  FROM public.organization_members om 
  WHERE om.user_id = t.user_id 
  LIMIT 1
)
WHERE t.organization_id IS NULL;
```

### Problema: Real-time não funciona
**Verificar**:
1. Console mostra: `[TaskDataProvider] Inscrevendo real-time para organization_id: ...`
2. Ao criar/editar task, console mostra eventos
3. Se não, verifique Realtime no Supabase Dashboard

### Problema: Cache do navegador
**Solução**:
1. Limpe localStorage: `localStorage.clear()` no console
2. Limpe cookies do site
3. Use aba anônima
4. Hard refresh: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)

## Próximos Passos

Se ainda houver problemas após seguir este guia:

1. **Colete informações**:
   - Screenshots dos console.logs
   - Organization IDs mostrados no sidebar de cada usuário
   - Resultado do script SQL de verificação

2. **Teste isolado**:
   - Crie 2 usuários novos
   - Adicione ambos à mesma organização manualmente
   - Teste se veem as mesmas tasks

3. **Verificação final**:
   - Execute todos os queries em `scripts/verify_collaboration.sql`
   - Compartilhe os resultados para análise

## Comandos Úteis

### Limpar e reiniciar
```bash
# Parar servidor
Ctrl+C

# Limpar cache Next.js
rm -rf .next

# Reiniciar servidor
npm run dev
```

### Verificar no Supabase
```sql
-- Ver todas as tasks com suas organizações
SELECT 
  t.id,
  t.title,
  t.organization_id,
  o.name as org_name,
  p.email as created_by
FROM public.tasks t
LEFT JOIN public.organizations o ON t.organization_id = o.id
LEFT JOIN public.profiles p ON t.user_id = p.id
ORDER BY t.created_at DESC;
```