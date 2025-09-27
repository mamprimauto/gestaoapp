-- Criar tabela de estruturas invisíveis (versão minimalista)
CREATE TABLE IF NOT EXISTS public.estruturas_invisiveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  anotacoes JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.estruturas_invisiveis ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam e gerenciem apenas suas próprias estruturas
DROP POLICY IF EXISTS "Users can manage their own estruturas_invisiveis" ON public.estruturas_invisiveis;
CREATE POLICY "Users can manage their own estruturas_invisiveis" ON public.estruturas_invisiveis
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_user_id ON public.estruturas_invisiveis(user_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_created_at ON public.estruturas_invisiveis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estruturas_invisiveis_titulo ON public.estruturas_invisiveis(titulo);

-- Comentários para documentar a tabela
COMMENT ON TABLE public.estruturas_invisiveis IS 'Tabela minimalista para armazenar análises de estruturas invisíveis com anotações';
COMMENT ON COLUMN public.estruturas_invisiveis.titulo IS 'Título da análise';
COMMENT ON COLUMN public.estruturas_invisiveis.conteudo IS 'Texto completo da análise';
COMMENT ON COLUMN public.estruturas_invisiveis.anotacoes IS 'Array de anotações no formato {start, end, tipo, cor}';

-- Inserir dados de exemplo minimalistas
INSERT INTO public.estruturas_invisiveis (
  titulo,
  conteudo,
  anotacoes
) VALUES 
(
  'Anúncio Intestino - Estrutura VSL',
  'Essa é a maneira mais rápida de limpar o cocô preso, a fibra ajuda a evacuar, certo? Não.

E sobre beber muita água? Não.

Provavelmente, você já viu esse cara falando sobre constipação antes.

Faça isso para limpar o cocô preso rapidamente.

Ele parece saber do que está falando…

Meio surpreendente, mas a diarreia é, na verdade, uma forma de constipação.

Estranho, certo?

A maioria das pessoas pensa que diarreia e constipação são duas coisas diferentes.

O fato é que a diarreia é a última tentativa desesperada do seu corpo para fazer as coisas se moverem novamente.

Então, embora a diarreia esteja movendo as coisas, nem todo o seu cocô coopera e sai, e o cocô mais teimoso fica para trás, preso nas ranhuras do cólon.

É chamado de método do cocô de 7 segundos, criado pela Dra. Gina Sam, uma das principais médicas de intestino da cidade de Nova York.

Se você está se sentindo cheio, se está se sentindo inchado, constipado, toque no botão abaixo deste vídeo para ver o método do cocô de 7 segundos da Dra. Sam agora.',
  '[
    {"start": 0, "end": 82, "tipo": "hook", "cor": "#fef3c7"},
    {"start": 84, "end": 112, "tipo": "problema", "cor": "#fee2e2"},
    {"start": 295, "end": 426, "tipo": "solucao", "cor": "#dcfce7"},
    {"start": 680, "end": 785, "tipo": "prova", "cor": "#dbeafe"},
    {"start": 920, "end": 1080, "tipo": "cta", "cor": "#f3e8ff"}
  ]'
),
(
  'Estrutura Emagrecimento Natural',
  'Você provavelmente já ouviu falar do Ozempic para emagrecer, certo?

Mas e se eu te dissesse que existe uma alternativa natural que funciona melhor e custa 50 vezes menos?

A indústria farmacêutica não quer que você saiba disso.

O Ozempic funciona bloqueando um hormônio específico no seu intestino.

Mas pesquisadores descobriram que uma planta comum pode fazer a mesma coisa, só que melhor.

Dr. Sarah Johnson, endocrinologista de Harvard, testou esta alternativa em 500 pacientes.

Os resultados foram impressionantes: 94% perderam pelo menos 15kg em 90 dias.

Clique no botão abaixo para descobrir esta alternativa natural ao Ozempic.',
  '[
    {"start": 0, "end": 70, "tipo": "hook", "cor": "#fef3c7"},
    {"start": 145, "end": 210, "tipo": "problema", "cor": "#fee2e2"},
    {"start": 315, "end": 425, "tipo": "solucao", "cor": "#dcfce7"},
    {"start": 450, "end": 580, "tipo": "prova", "cor": "#dbeafe"},
    {"start": 650, "end": 750, "tipo": "cta", "cor": "#f3e8ff"}
  ]'
);