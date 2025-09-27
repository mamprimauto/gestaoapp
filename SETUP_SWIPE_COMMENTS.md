# Setup - Sistema de Comentários do Swipe File

## 1. Criar tabela de comentários no Supabase

### Acesse o SQL Editor e execute:

```sql
-- Sistema de comentários para Swipe Files

CREATE TABLE IF NOT EXISTS public.swipe_file_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swipe_file_id UUID NOT NULL REFERENCES public.swipe_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_swipe_comments_file ON public.swipe_file_comments(swipe_file_id);
CREATE INDEX IF NOT EXISTS idx_swipe_comments_user ON public.swipe_file_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_comments_created ON public.swipe_file_comments(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_swipe_comments_updated_at ON public.swipe_file_comments;
CREATE TRIGGER update_swipe_comments_updated_at
  BEFORE UPDATE ON public.swipe_file_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_comments_updated_at();
```

## 2. Criar bucket no Storage para imagens

### Execute no SQL Editor:

```sql
-- Script simplificado - SEM ERROS

-- 1. Criar o bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('swipe-file-comments', 'swipe-file-comments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "Allow authenticated uploads swipe comments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing swipe comments" ON storage.objects;

-- 3. Criar política de upload
CREATE POLICY "Allow authenticated uploads swipe comments" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'swipe-file-comments');

-- 4. Criar política de visualização pública
CREATE POLICY "Allow public viewing swipe comments" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'swipe-file-comments');
```

### OU crie manualmente no Dashboard:

1. Vá para **Storage** no menu lateral
2. Clique em **New bucket**
3. Configure:
   - **Name**: `swipe-file-comments`
   - **Public bucket**: ✅ IMPORTANTE: Marcar como público
4. Clique em **Create bucket**

## 3. Como usar

### Visualizar detalhes e comentários:
1. **Clique em qualquer linha** da tabela de bibliotecas
2. O modal de detalhes abrirá com:
   - Informações da biblioteca à esquerda
   - Sistema de comentários à direita

### Adicionar comentários:
1. Digite o texto no campo de comentário
2. Opcionalmente, clique no ícone de imagem para anexar
3. Pressione Enter ou clique em Enviar

### Funcionalidades dos comentários:
- ✅ Texto com quebras de linha
- ✅ Upload de imagens (máx 5MB)
- ✅ Visualização de imagens em tela cheia
- ✅ Avatar do usuário
- ✅ Timestamp relativo
- ✅ Scroll automático para o último comentário

## 4. Troubleshooting

### Erro ao carregar comentários:
- Verifique se a tabela `swipe_file_comments` existe
- Confirme se a tabela `profiles` tem os usuários

### Erro ao fazer upload de imagem:
- Verifique se o bucket `swipe-file-comments` existe
- Confirme se o bucket está público
- Verifique o tamanho da imagem (máx 5MB)

### Imagens não aparecem:
- Verifique as políticas do bucket
- Confirme se o bucket está marcado como público

## 5. Estrutura do sistema

```
┌─────────────────────────────────────────┐
│         Modal de Detalhes               │
├──────────────────┬──────────────────────┤
│                  │                      │
│   Informações    │     Comentários      │
│   - Nome         │  ┌────────────────┐  │
│   - Nicho        │  │ [Avatar] User  │  │
│   - Anúncios     │  │ Texto do       │  │
│   - Link         │  │ comentário...  │  │
│   - Criado em    │  │ [Imagem]       │  │
│   - Estatísticas │  └────────────────┘  │
│                  │                      │
│                  │  [📸] [Enviar]       │
└──────────────────┴──────────────────────┘
```

## 6. Recursos implementados

- **Modal de detalhes**: Visualização completa da biblioteca
- **Sistema de comentários**: Similar ao de tarefas e criativos
- **Upload de imagens**: Com preview e lightbox
- **Estatísticas de rastreamento**: Integrado com o sistema existente
- **Interface responsiva**: Layout em duas colunas