# Setup do Sistema de Nichos - Swipe Files

## Para ativar o gerenciamento de nichos:

### 1. Acesse o Supabase Dashboard
https://supabase.com/dashboard

### 2. Vá para SQL Editor

### 3. Execute este código SQL:

```sql
-- Criar tabela para gerenciar nichos personalizados

CREATE TABLE IF NOT EXISTS public.swipe_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_swipe_niches_user ON public.swipe_niches(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_niches_active ON public.swipe_niches(is_active);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_niches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_swipe_niches_updated_at ON public.swipe_niches;
CREATE TRIGGER update_swipe_niches_updated_at
  BEFORE UPDATE ON public.swipe_niches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_niches_updated_at();

-- Inserir nichos padrão
INSERT INTO public.swipe_niches (name, color) VALUES
  ('Disfunção Erétil (ED)', 'blue'),
  ('Emagrecimento', 'green'),
  ('Finanças', 'yellow'),
  ('Beleza', 'pink'),
  ('Saúde', 'red'),
  ('Fitness', 'orange'),
  ('Relacionamento', 'purple'),
  ('Educação', 'indigo'),
  ('Tecnologia', 'cyan'),
  ('Marketing', 'emerald'),
  ('Outros', 'gray')
ON CONFLICT (name) DO NOTHING;

-- Verificar
SELECT 
  'Nichos criados!' as status,
  COUNT(*) as total_nichos
FROM public.swipe_niches;
```

### 4. Clique em "Run" para executar

### 5. Pronto! O sistema de nichos está ativo

## Como usar:

### 1. **Acessar Configurações de Nichos:**
   - Na página Swipe File, clique no ícone de engrenagem ⚙️
   - O modal de gerenciamento será aberto

### 2. **Adicionar Novo Nicho:**
   - Digite o nome do nicho
   - Escolha uma cor
   - Clique no botão "+"

### 3. **Desativar Nicho:**
   - Use o switch ao lado do nicho
   - Nichos desativados não aparecem no formulário

### 4. **Remover Nicho:**
   - Clique no ícone de lixeira 🗑️
   - Confirme a exclusão

### 5. **Cores Disponíveis:**
   - 🔵 Azul
   - 🟢 Verde
   - 🟡 Amarelo
   - 🩷 Rosa
   - 🔴 Vermelho
   - 🟠 Laranja
   - 🟣 Roxo
   - 🔷 Índigo
   - 🟦 Ciano
   - 🟩 Esmeralda
   - ⚫ Cinza

## Funcionalidades:

- ✅ Adicionar nichos personalizados
- ✅ Escolher cores para cada nicho
- ✅ Ativar/desativar nichos
- ✅ Remover nichos não utilizados
- ✅ Atualização automática no formulário

## Troubleshooting:

**Modal não abre:**
- Execute o SQL de criação da tabela
- Recarregue a página (F5)

**Nicho não aparece no formulário:**
- Verifique se está ativo (switch ligado)
- Recarregue a página após adicionar

**Erro ao adicionar nicho:**
- Verifique se o nome já existe
- Nome não pode estar vazio