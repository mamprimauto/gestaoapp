# 📚 Setup do Sistema de Cursos

## ✅ Status da Implementação

O sistema de cursos está **100% implementado** no código, incluindo:

- ✅ Página de listagem de cursos (`/cursos`)
- ✅ Página de visualização com player Vimeo (`/cursos/[id]`)
- ✅ Painel administrativo em `/equipe` (aba Cursos)
- ✅ APIs completas para CRUD de cursos e aulas
- ✅ Sistema de progresso e tracking

## 🚨 O que está faltando?

**As tabelas no banco de dados ainda não foram criadas!**

## 📋 Passos para Ativar o Sistema

### 1️⃣ Executar a Migration no Supabase

1. Acesse seu painel do Supabase
2. Vá para **SQL Editor**
3. Cole e execute o conteúdo do arquivo: `scripts/db/060_courses_system.sql`
4. Aguarde a confirmação de sucesso

### 2️⃣ Verificar se você é Admin

1. Faça login na aplicação
2. Acesse `/equipe`
3. Se você não vê a aba "Cursos", você precisa:
   - Acessar o Supabase
   - Ir na tabela `profiles`
   - Encontrar seu usuário
   - Mudar o campo `role` para `admin`
   - Mudar o campo `approved` para `true`

### 3️⃣ Adicionar seu Primeiro Curso

1. Acesse `/equipe`
2. Clique na aba **"Cursos"**
3. Clique em **"Novo Curso"**
4. Preencha os dados:
   - **Título**: Nome do curso
   - **Descrição**: Descrição breve
   - **Instrutor**: Nome do instrutor
   - **Categoria**: Escolha uma categoria
   - **Duração**: Tempo total em minutos
   - **Thumbnail**: URL de uma imagem (pode usar do Unsplash)
   - **Publicar**: Marque para tornar visível

### 4️⃣ Adicionar Aulas ao Curso

1. Após criar o curso, clique na seta para expandir
2. Clique em **"Nova Aula"**
3. Preencha:
   - **Título da Aula**: Nome da aula
   - **Descrição**: Breve descrição (opcional)
   - **ID do Vimeo**: O número do vídeo no Vimeo
     - Exemplo: Se a URL é `vimeo.com/123456789`, o ID é `123456789`
   - **Duração**: Tempo em segundos

### 5️⃣ Testar o Sistema

1. Acesse `/cursos` para ver os cursos publicados
2. Clique em um curso para assistir as aulas
3. O progresso será salvo automaticamente

## 🔍 Solução de Problemas

### "Não vejo a aba Cursos em /equipe"

- Você precisa ser admin
- Verifique na tabela `profiles` do Supabase:
  - `role` = 'admin'
  - `approved` = true

### "Erro ao criar curso"

- Verifique se executou a migration SQL
- Confirme que está logado como admin
- Verifique o console do navegador para erros

### "Vídeos do Vimeo não carregam"

- Verifique se o ID do vídeo está correto
- O vídeo precisa estar público ou ter permissões adequadas
- Teste o ID acessando: `vimeo.com/SEU_ID_AQUI`

## 📊 Estrutura das Tabelas

```sql
courses
├── id (UUID)
├── title (TEXT)
├── description (TEXT)
├── thumbnail_url (TEXT)
├── instructor (TEXT)
├── category (TEXT)
├── duration_minutes (INTEGER)
├── is_published (BOOLEAN)
└── created_by (UUID)

lessons
├── id (UUID)
├── course_id (UUID)
├── title (TEXT)
├── description (TEXT)
├── vimeo_id (TEXT)
├── duration_seconds (INTEGER)
└── order_index (INTEGER)

lesson_progress
├── id (UUID)
├── user_id (UUID)
├── lesson_id (UUID)
├── course_id (UUID)
├── progress_percentage (INTEGER)
├── completed (BOOLEAN)
└── last_position_seconds (INTEGER)
```

## 🎯 Recursos Implementados

- ✅ **CRUD Completo**: Criar, ler, atualizar e deletar cursos e aulas
- ✅ **Player Vimeo**: Integração completa com tracking
- ✅ **Progresso Automático**: Salva a cada 10 segundos
- ✅ **Marcação de Conclusão**: Automática ao atingir 90% do vídeo
- ✅ **Interface Admin**: Painel completo de gerenciamento
- ✅ **Publicação**: Controle de visibilidade dos cursos
- ✅ **Categorias**: Organização por tipo de conteúdo
- ✅ **Ordenação**: Aulas organizadas por ordem

## 💡 Dicas

1. **IDs do Vimeo**: Sempre teste o ID antes de adicionar
2. **Thumbnails**: Use imagens em 16:9 para melhor visualização
3. **Categorias**: Mantenha consistência nas categorias
4. **Progresso**: O sistema marca como completo com 90% assistido

## 🚀 Próximos Passos (Opcional)

- Adicionar certificados de conclusão
- Sistema de avaliação por estrelas
- Comentários nas aulas
- Download de materiais complementares
- Busca e filtros avançados
- Dashboard de analytics

---

**Após executar o SQL no Supabase, o sistema estará 100% funcional!**