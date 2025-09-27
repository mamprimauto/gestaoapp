# 🚀 GUIA RÁPIDO - Ativar Sistema de Permissões do Vault

## ⚡ PASSO A PASSO (5 minutos)

### 📋 **PASSO 1: Executar Migração**

1. Vá para o **Supabase Dashboard** → **SQL Editor**
2. Copie TODO o conteúdo do arquivo `EXECUTAR_MIGRACAO_VAULT.sql`
3. Cole no SQL Editor
4. Clique em **RUN** 
5. ✅ Deve aparecer: "SUCESSO! Sistema de permissões instalado!"

### 👤 **PASSO 2: Configurar Primeiro Admin**

1. No mesmo SQL Editor, execute:

```sql
-- VER SEU EMAIL E ID
SELECT id, email FROM auth.users WHERE email = 'SEU_EMAIL_AQUI';
```

2. Substitua `SEU_EMAIL_AQUI` pelo seu email e execute

3. Copie o `id` que aparecer

4. Execute este comando (substitua o ID):

```sql
-- TORNAR VOCÊ ADMIN
UPDATE user_permissions 
SET 
    access_level = 'admin',
    can_create_shared = true,
    can_access_cross_department = true
WHERE user_id = 'COLE_SEU_ID_AQUI';
```

### 🎉 **PRONTO!**

- Faça logout e login novamente no vault
- O banner azul deve desaparecer
- Agora você pode criar senhas com visibilidade por equipe!

---

## 🎛️ **Como Usar**

### **Criar Senha Compartilhada:**
1. Clique "Adicionar" no vault
2. Preencha os dados normalmente  
3. Na seção "Visibilidade da Senha":
   - **👤 Pessoal**: Só você vê
   - **👥 Equipe**: Todo seu departamento vê
   - **👔 Gestores**: Gestores e admins veem
   - **🛡️ Administradores**: Só admins veem
   - **⚙️ Personalizado**: Escolha departamentos específicos

### **Filtrar Senhas:**
- Use os filtros na parte superior
- **"Todas as visibilidades"** → escolha um nível específico
- **"Apenas compartilhadas"** → vê senhas de outros usuários

---

## 👥 **Configurar Outros Usuários**

Use o arquivo `CONFIGURAR_USUARIOS_VAULT.sql` como base e substitua os emails pelos reais da sua equipe.

### **Níveis de Acesso:**
- **🛡️ Admin**: Vê tudo, gerencia permissões
- **👔 Gestor**: Gerencia departamento, cria senhas compartilhadas  
- **👤 Usuário**: Acesso básico ao próprio departamento

### **Departamentos:**
- **🛡️ Administrador**: Acesso Total (nível admin)
- **🎬 Editor**: Editor de vídeo
- **✏️ Copywriter**: Criação de textos
- **📊 Gestor de Tráfego**: Gestão de campanhas (nível manager)
- **⛏️ Minerador**: Acesso Parcial
- **👤 Particular**: Uso pessoal

---

## ❓ **Dúvidas Comuns**

**Q: O banner azul não sumiu?**  
A: Faça logout/login no vault ou atualize a página

**Q: Não consigo criar senhas compartilhadas?**  
A: Verifique se `can_create_shared = true` no seu usuário

**Q: Erro na migração?**  
A: Execute linha por linha se der erro no script completo

**Q: Como voltar ao modo anterior?**  
A: As senhas antigas ficam como "Pessoal" automaticamente

---

**🔐 Sistema 100% seguro - suas senhas continuam criptografadas!**