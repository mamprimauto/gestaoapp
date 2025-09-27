# Sistema Pesquisa & Inteligência

O Sistema Pesquisa & Inteligência foi dividido em duas seções principais para melhor organização:

## 🔗 Estrutura de Navegação

### Página Principal: `/swipe-file`
Página de seleção com duas opções:

1. **Bibliotecas do Facebook** → `/swipe-file/bibliotecas`
2. **Briefings e Pesquisas** → `/swipe-file/briefings`

## 📚 Seção 1: Bibliotecas do Facebook

**Rota:** `/swipe-file/bibliotecas`

### Funcionalidades:
- ✅ Visualizar bibliotecas por nicho
- ✅ Rastrear crescimento de anúncios
- ✅ Solicitar acesso Insider
- ✅ Identificar campanhas escalando
- ✅ Gerenciar nichos personalizados
- ✅ Filtros por nicho e busca

### Como usar:
1. Acesse a seção "Bibliotecas do Facebook"
2. Adicione novas bibliotecas clicando em "Nova Biblioteca"
3. Configure rastreamento para monitorar crescimento
4. Solicite acesso Insider para bibliotecas importantes
5. Use filtros para encontrar bibliotecas específicas

## 📝 Seção 2: Briefings e Pesquisas

**Rota:** `/swipe-file/briefings`

### Funcionalidades:
- ✅ Criar briefings completos de produtos
- ✅ Organizar por categorias
- ✅ Filtros avançados
- ✅ Formulário com 18 campos detalhados

### Campos do Briefing:

#### 🔵 Informações Básicas
- **Nome do Produto** *(obrigatório)*
- **Categoria** *(obrigatório)*  
- **Descrição Breve**

#### 👥 Público e Mercado
- **Público-Alvo**
- **Problema que Resolve**

#### 💎 Proposta de Valor
- **Benefícios Principais**
- **Diferencial Competitivo**

#### 💰 Estratégia Comercial
- **Preço Sugerido**
- **Orçamento de Marketing**
- **Canais de Venda**

#### 📢 Comunicação
- **Tom de Comunicação**
- **Palavras-Chave**
- **Referências e Inspirações**

#### 📅 Planejamento
- **Prazo de Lançamento**
- **KPIs de Sucesso**
- **Restrições Legais**

#### 📋 Extras
- **Observações Adicionais**

## 🗄️ Configuração do Banco de Dados

### Para Bibliotecas (já existente):
As tabelas já estão configuradas:
- `swipe_files`
- `swipe_file_tracking`
- `swipe_niches`

### Para Briefings (novo):
Execute o script SQL no Supabase:

```sql
-- Execute o arquivo: scripts/db/briefings.sql
```

Este script criará:
- Tabela `briefings` com todos os campos
- Políticas RLS (Row Level Security)
- Índices para performance
- Triggers automáticos
- Dados de exemplo

## 🎨 Categorias Predefinidas

### Bibliotecas:
- Disfunção Erétil (ED)
- Emagrecimento
- Finanças
- Beleza
- Saúde
- Fitness
- Relacionamento
- Outros

### Briefings:
- Emagrecimento
- Saúde
- Beleza
- Fitness
- Nutrição
- Bem-estar
- Relacionamento
- Finanças
- Educação
- Tecnologia
- Outros

## 🚀 Como Começar

1. **Execute o script SQL** para criar a tabela de briefings
2. **Acesse** `/swipe-file` no navegador
3. **Escolha** a seção desejada
4. **Comece criando** seu primeiro briefing ou biblioteca

## 🔄 Navegação

- Use o botão "Voltar para Pesquisa & Inteligência" para retornar à página principal
- Cada seção mantém seus próprios filtros e configurações
- Interface responsiva e otimizada para desktop e mobile

## 💡 Dicas de Uso

### Para Briefings:
- Preencha todos os campos relevantes para briefings mais completos
- Use o campo "Referências" para links de inspiração
- Defina KPIs claros para medir sucesso
- Categorize corretamente para facilitar filtros

### Para Bibliotecas:
- Configure rastreamento para bibliotecas importantes
- Solicite Insider apenas quando necessário
- Use filtros para encontrar bibliotecas por nicho
- Monitore o ícone 🔥 que indica campanhas escalando