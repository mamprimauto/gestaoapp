-- Criar tabela de briefings criativos
CREATE TABLE IF NOT EXISTS briefings_criativos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_projeto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao_breve TEXT,
  
  -- Top 10 Anúncios Escalados do Nicho
  top_10_anuncios_nicho TEXT,
  estrutura_invisivel_nicho TEXT,
  
  -- Top 10 Anúncios de Nichos Similares
  top_10_anuncios_similares TEXT,
  estrutura_invisivel_similares TEXT,
  
  -- Tendências Virais do Nicho
  formatos_anuncios_escalados TEXT,
  formatos_anuncios_similares TEXT,
  formatos_video_organico TEXT,
  pontos_comuns_copy_nicho TEXT,
  pontos_comuns_copy_similares TEXT,
  principais_angulos_validados TEXT,
  hooks_visuais_escalados TEXT,
  
  -- Observações
  observacoes_extras TEXT,
  
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE briefings_criativos ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam e gerenciem apenas seus próprios briefings
CREATE POLICY "Users can manage their own creative briefings" ON briefings_criativos
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_briefings_criativos_updated_at BEFORE UPDATE ON briefings_criativos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_briefings_criativos_user_id ON briefings_criativos(user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_criativos_categoria ON briefings_criativos(categoria);
CREATE INDEX IF NOT EXISTS idx_briefings_criativos_created_at ON briefings_criativos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_criativos_nome_projeto ON briefings_criativos(nome_projeto);

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO briefings_criativos (
  nome_projeto,
  categoria,
  descricao_breve,
  top_10_anuncios_nicho,
  estrutura_invisivel_nicho,
  formatos_anuncios_escalados,
  pontos_comuns_copy_nicho,
  principais_angulos_validados,
  hooks_visuais_escalados
) VALUES 
(
  'Criativos Diabetes 2024',
  'Diabetes',
  'Pesquisa de criativos escalados para campanhas de produtos para diabetes',
  '1. Anúncio UGC especialista falando sobre descoberta revolucionária
2. Vídeo conspiracionista sobre indústria farmacêutica esconder cura
3. Depoimento de paciente que reverteu diabetes em 30 dias
4. Médico revelando segredo que BigPharma não quer que você saiba
5. Comparação chocante: remédio vs. método natural
...',
  'Hook Visual: Especialista em jaleco branco
Ângulo: Conspiração + Autoridade
Formato: UGC com depoimento
Copy: Alerta urgente sobre farsa da indústria
CTA: Descobrir método natural agora',
  'UGC com especialistas, Vídeos conspiracionistas, Depoimentos de reversão',
  'Todos apresentam pesquisa revolucionária, são conspiracionistas/batem na indústria farmacêutica, batem em sintomas secundários da diabetes (fadiga, cansaço, formigamento), são UGC com especialista falando',
  'Ângulo Contrarian + Alerta Urgente
Hook: "Médico revela como Big Pharma esconde a cura para diabetes que custa menos de R$ 5"

Ângulo Descoberta + Autoridade
Hook: "Paciente com diabetes há 20 anos descobre método japonês que baixa glicose em 72h"',
  'Receitas com ingredientes naturais, Vídeos de teste de glicose, Comparações antes/depois, Médicos em jalecos, Ingredientes simples da cozinha'
),
(
  'Criativos Emagrecimento Q1',
  'Emagrecimento',
  'Análise de criativos de alta performance para suplementos de emagrecimento',
  '1. Influencer mostrando antes/depois em 30 dias
2. Nutrólogo revelando segredo de Hollywood
3. Mãe de família perdeu 25kg sem dieta
4. Comparação com Ozempic - método natural vs. remédio
5. Teste ao vivo queimando gordura
...',
  'Hook Visual: Transformação corporal dramática
Ângulo: Sem esforço + Resultados rápidos  
Formato: UGC com influencer
Copy: Foco em benefício emocional (autoestima)
CTA: Método exclusivo disponível por tempo limitado',
  'UGC com influencers fitness, Transformações visuais, Comparações com remédios',
  'Foco em "sem dieta/sem exercício", prometem resultados em 30 dias, usam antes/depois visual, batem na frustração com dietas que falharam',
  'Ângulo Sem Esforço + Urgência
Hook: "Joguei fora meu Ozempic e emagreci 15kg comendo pizza todos os dias"

Ângulo Descoberta + Social Proof
Hook: "Nutricionista das famosas revela truque que fez 50 mil mulheres emagrecerem sem academia"',
  'Antes/depois em roupas justas, Comidas "proibidas", Balanças mostrando peso, Ingredientes naturais, Mulheres felizes se pesando'
);