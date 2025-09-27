# 🔧 RESOLVER ERRO: "invalid input value for enum user_department"

## ❌ **Problema:**
O banco de dados ainda tem os departamentos antigos (`copy`, `edicao`) mas o código está tentando usar os novos (`administrador`, `editor`, etc.).

## ✅ **Solução em 3 Passos:**

### **PASSO 1: Migrar os Departamentos**
No **Supabase SQL Editor**, execute:
```sql
-- Copie e cole TODO o arquivo:
MIGRACAO_DEPARTAMENTOS_FINAL.sql
```

Este script vai:
- ✅ Converter departamentos antigos para novos automaticamente
- ✅ Manter todos os dados existentes
- ✅ Atualizar os enums corretamente

### **PASSO 2: Configurar Usuários**
Após a migração, execute:
```sql  
-- Copie e cole TODO o arquivo:
CONFIGURAR_NOVOS_DEPARTAMENTOS.sql
```

**IMPORTANTE:** Edite o email no script antes de executar:
```sql
-- Linha 15: substitua pelo seu email real
WHERE email = 'SEU_EMAIL_REAL_AQUI'
```

### **PASSO 3: Testar**
1. Faça **logout/login** no vault
2. O banner azul deve **desaparecer**
3. Teste **criar senha** com "Visibilidade Personalizada"
4. Verifique se aparece os **novos departamentos**

---

## 📋 **Mapeamento Automático:**

A migração converte automaticamente:
- `copy` → `copywriter` ✏️
- `edicao` → `editor` 🎬  
- `gestor` → `gestor` 📊 (mantém)
- `particular` → `particular` 👤 (mantém)

**Novos departamentos disponíveis:**
- `administrador` 🛡️ (novo)
- `minerador` ⛏️ (novo)

---

## 🚨 **Se der erro:**

### **Erro: "relation does not exist"**
Execute primeiro: `EXECUTAR_MIGRACAO_VAULT.sql` (o original)

### **Erro: "permission denied"**  
Use o **service role key** no Supabase, não a anon key

### **Script muito grande**
Execute **seção por seção** (cada `-- ===== PARTE X =====`)

---

## ✅ **Resultado Esperado:**

Após executar ambos os scripts, você deve ver:
```
✅ Migração concluída com sucesso!

department    | total
--------------+-------
administrador | 1
copywriter    | 2  
editor        | 1
gestor        | 1
minerador     | 0
particular    | 3
```

---

**🎯 Com isso, o vault funcionará perfeitamente com os novos departamentos!**