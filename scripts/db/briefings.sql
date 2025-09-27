-- Criar tabela de briefings
CREATE TABLE IF NOT EXISTS briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_produto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao_breve TEXT,
  publico_alvo TEXT,
  problema_resolve TEXT,
  beneficios_principais TEXT,
  diferencial_competitivo TEXT,
  preco_sugerido TEXT,
  canais_venda TEXT,
  referencias_inspiracao TEXT,
  tom_comunicacao TEXT,
  palavras_chave TEXT,
  restricoes_legais TEXT,
  prazo_lancamento TEXT,
  orcamento_marketing TEXT,
  kpis_sucesso TEXT,
  observacoes_extras TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam e gerenciem apenas seus próprios briefings
CREATE POLICY "Users can manage their own briefings" ON briefings
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_briefings_updated_at BEFORE UPDATE ON briefings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_categoria ON briefings(categoria);
CREATE INDEX IF NOT EXISTS idx_briefings_created_at ON briefings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_nome_produto ON briefings(nome_produto);

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO briefings (
  nome_produto,
  categoria,
  descricao_breve,
  publico_alvo,
  problema_resolve,
  beneficios_principais,
  diferencial_competitivo,
  preco_sugerido,
  canais_venda,
  tom_comunicacao,
  palavras_chave,
  prazo_lancamento,
  kpis_sucesso
) VALUES 
(
  'NutraFit Pro',
  'Emagrecimento',
  'Suplemento natural para acelerar o metabolismo e queimar gordura',
  'Mulheres de 25-45 anos que querem emagrecer de forma saudável',
  'Dificuldade para perder peso mesmo com dieta e exercício',
  'Acelera metabolismo, queima gordura, aumenta energia, reduz apetite',
  'Fórmula exclusiva com ingredientes naturais clinicamente testados',
  'R$ 97,00',
  'Site próprio, Instagram, Facebook',
  'Inspiracional e Motivador',
  'emagrecimento, suplemento natural, queimar gordura, acelerar metabolismo',
  '30 dias',
  '100 vendas/mês, ROAS 3x'
),
(
  'Curso Copy Magnética',
  'Educação',
  'Curso completo de copywriting para vendas online',
  'Empreendedores e profissionais de marketing que querem aumentar vendas',
  'Dificuldade para escrever textos que vendem',
  'Aprenda técnicas avançadas de persuasão, aumente suas vendas, torne-se um expert',
  'Metodologia exclusiva com cases reais e acompanhamento pessoal',
  'R$ 497,00',
  'Site próprio, webinars, parcerias',
  'Profissional e Técnico',
  'copywriting, vendas, persuasão, marketing digital',
  '45 dias',
  '50 vendas/mês, NPS 9+'
);