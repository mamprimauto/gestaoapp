-- Migração para adicionar novos campos de briefing avançado
-- Execute este script no Supabase SQL Editor

-- Adicionar novos campos à tabela briefings existente
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS mercado_alvo TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS tendencia_conteudo TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS tendencia_consumo TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS tendencia_marketing TEXT;

-- Mecanismos e Estratégia
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS mecanismos_campeoes TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS mecanismo_adaptacao TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS mecanismo_problema TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS mecanismo_solucao TEXT;

-- Big Idea e Copy
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS big_idea_formato TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS historia_conspiracionista TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS perguntas_paradoxais TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS nome_chiclete TEXT;

-- Oferta Detalhada
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS ingredientes_entregaveis TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS beneficios_multiplos TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS bullets_headlines TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS garantia TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS bonus TEXT;

-- Demografia e Psicologia
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS atitudes_publico TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS esperancas_sonhos TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS dores_medos TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS vitorias_fracassos TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS inimigo_externo TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS preconceitos TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS crencas_fundamentais TEXT;

-- Análise Competitiva
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS solucoes_existentes TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS experiencia_produtos TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS gostam_solucoes TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS nao_gostam_solucoes TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS historias_terror TEXT;

-- Storytelling e Leads
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS historia_produto TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS leads_blockbusters TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS leads_modelados TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS nivel_consciencia TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS nivel_sofisticacao TEXT;

-- Adicionar índices para os novos campos mais importantes
CREATE INDEX IF NOT EXISTS idx_briefings_mercado_alvo ON briefings(mercado_alvo);
CREATE INDEX IF NOT EXISTS idx_briefings_big_idea_formato ON briefings(big_idea_formato);
CREATE INDEX IF NOT EXISTS idx_briefings_nome_chiclete ON briefings(nome_chiclete);
CREATE INDEX IF NOT EXISTS idx_briefings_nivel_consciencia ON briefings(nivel_consciencia);

-- Atualizar dados de exemplo existentes com alguns dos novos campos
UPDATE briefings 
SET 
    mercado_alvo = 'Emagrecimento feminino - mercado com alta demanda e disposição para investir em soluções naturais',
    big_idea_formato = 'Grande Conspiração',
    historia_conspiracionista = 'A indústria farmacêutica esconde fórmulas naturais eficazes para manter lucros altos',
    nome_chiclete = 'Fórmula Secreta do Metabolismo',
    ingredientes_entregaveis = 'Suplemento de 60 cápsulas + Manual de ativação metabólica + Suporte via WhatsApp',
    beneficios_multiplos = 'Queima gordura, acelera metabolismo, aumenta energia, reduz apetite, melhora humor, regula hormônios',
    garantia = '30 dias incondicional - 100% do dinheiro de volta',
    bonus = 'E-book Receitas Detox + Planner 30 dias + Masterclass Mindset Emagrecimento',
    atitudes_publico = 'Mulheres trabalhadoras, mães, que valorizam saúde natural, desconfiam de remédios químicos',
    esperancas_sonhos = 'Emagrecer sem sofrimento, ter energia para cuidar da família, sentir-se bonita e confiante',
    dores_medos = 'Medo de engordar mais, frustração com dietas que não funcionam, baixa autoestima',
    inimigo_externo = 'Indústria alimentícia que vicia em açúcar e carboidratos processados',
    nivel_consciencia = 'Consciente do problema',
    nivel_sofisticacao = 'Mercado sofisticado - já tentaram várias soluções'
WHERE nome_produto = 'NutraFit Pro';

UPDATE briefings 
SET 
    mercado_alvo = 'Empreendedores digitais e profissionais de marketing que querem aumentar vendas através de copy',
    big_idea_formato = 'Pergunta Paradoxal',
    historia_conspiracionista = 'Gurus escondem técnicas reais de persuasão para manter monopólio no mercado',
    nome_chiclete = 'Copy Magnética Irresistível',
    ingredientes_entregaveis = 'Curso online 15 módulos + Templates prontos + Grupo VIP + Mentoria em grupo',
    beneficios_multiplos = 'Aumenta conversões, gera mais leads, cria autoridade, automatiza vendas, escala negócio',
    garantia = '60 dias + garantia de resultado - dobro do dinheiro de volta se não aumentar vendas',
    bonus = 'Pack 100 Headlines + Swipe File Premium + Workshop Psicologia de Vendas',
    atitudes_publico = 'Empreendedores ambiciosos, que valorizam resultados práticos, investem em educação',
    esperancas_sonhos = 'Escalar o negócio, ter liberdade financeira, ser reconhecido como autoridade',
    dores_medos = 'Medo de fracassar, frustração com baixas conversões, impostor syndrome',
    inimigo_externo = 'Algoritmos das redes sociais que dificultam alcance orgânico',
    nivel_consciencia = 'Consciente do problema e da solução',
    nivel_sofisticacao = 'Mercado muito sofisticado - já compraram vários cursos'
WHERE nome_produto = 'Curso Copy Magnética';

-- Comentário: Execute este script no SQL Editor do Supabase para adicionar os novos campos
-- Os dados existentes não serão perdidos e os novos campos ficarão disponíveis