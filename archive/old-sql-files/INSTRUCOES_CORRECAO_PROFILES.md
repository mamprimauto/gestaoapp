# 🚨 INSTRUÇÕES PARA CORRIGIR ERROS DE PROFILES

## Problema Identificado
Os perfis não estão sendo carregados corretamente devido a políticas RLS (Row Level Security) incompletas no Supabase.

## Solução Imediata

### 1. Execute o Script SQL no Supabase

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **SQL Editor**
3. Cole TODO o conteúdo do arquivo `FIX_PROFILES_RLS_COMPLETE.sql`
4. Clique em **Run** para executar
5. Aguarde a mensagem de sucesso

### 2. O que o Script Faz

- ✅ Cria perfis para todos os usuários existentes
- ✅ Adiciona política INSERT que estava faltando
- ✅ Corrige todas as políticas RLS
- ✅ Garante que o trigger funcione para novos usuários
- ✅ Define roles corretos (admin para igorzimpel@gmail.com)

### 3. Verificação

Após executar o script, você verá:
- Quantos usuários existem vs quantos perfis
- Lista de políticas criadas
- Confirmação de que todos os usuários têm perfil

### 4. Resultado Esperado

Após a correção:
- ❌ Não haverá mais erros 401 no console
- ✅ Profiles carregarão normalmente
- ✅ Vault funcionará sem mensagens de fallback
- ✅ task-data.tsx não precisará usar profiles hardcoded

## Arquivos Relacionados

- **Script Principal:** `FIX_PROFILES_RLS_COMPLETE.sql`
- **Script Anterior (opcional):** `FIX_PROFILES_VAULT.sql`
- **Migração Original:** `scripts/db/003_profiles.sql`
- **Correção de RLS:** `scripts/db/024_fix_profiles_final.sql`

## Notas Importantes

- O script é **idempotente** - pode ser executado múltiplas vezes sem problemas
- Não tenta criar perfis duplicados
- Preserva dados existentes
- Adiciona política INSERT que estava faltando

## Após a Correção

1. Faça refresh na página
2. Verifique o console do navegador
3. Não deve haver mais erros de profiles
4. O vault deve funcionar normalmente sem fallbacks

---

**⚠️ IMPORTANTE:** Execute o script `FIX_PROFILES_RLS_COMPLETE.sql` AGORA para resolver todos os problemas!