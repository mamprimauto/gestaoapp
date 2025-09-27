"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { 
  Zap, 
  Target, 
  FlaskConical, 
  TrendingUp, 
  BarChart3, 
  Rocket, 
  Trophy, 
  Brain, 
  Shield, 
  Crown,
  ChevronDown
} from "lucide-react"

const mandamentos = [
  {
    numero: "01",
    titulo: "Velocidade é Rei",
    descricao: "Em tráfego direto, tempo é a moeda mais valiosa. Quem age rápido, testa rápido e aprende rápido, vence. Demora custa caro, e a lentidão mata resultados.",
    icon: Zap
  },
  {
    numero: "02",
    titulo: "80/20 é Nossa Bússola",
    descricao: "Não buscamos fazer tudo, buscamos fazer o que realmente importa. Focamos nos 20% das ações que trazem 80% dos resultados. Produtividade não é fazer mais, é fazer melhor.",
    icon: Target
  },
  {
    numero: "03",
    titulo: "Crescemos com Testes",
    descricao: "O mercado é construído em cima de hipóteses. Por isso, não opinamos, testamos. Só o teste decide o que funciona e o que deve ser descartado.",
    icon: FlaskConical
  },
  {
    numero: "04",
    titulo: "Pensamos em Escala",
    descricao: "Não criamos soluções para hoje, criamos sistemas que aguentam amanhã. Cada processo é feito para ser multiplicado, cada ação para ser replicada. Tudo que não escala, morre.",
    icon: TrendingUp
  },
  {
    numero: "05",
    titulo: "Pessoas Mentem, Números Não",
    descricao: "Opiniões mudam, egos enganam, mas os dados revelam a verdade. ROI, CTR, CPA e LTV são nossas bússolas. Quem não respeita os números, não sobrevive aqui.",
    icon: BarChart3
  },
  {
    numero: "06",
    titulo: "Jogamos Alto, Sempre",
    descricao: "Não buscamos o caminho seguro, buscamos o caminho grande. Assumimos riscos calculados porque sabemos que só quem ousa conquista o extraordinário. Preferimos falhar tentando algo grandioso do que acertar em algo medíocre.",
    icon: Rocket,
  },
  {
    numero: "07",
    titulo: "Recompensa pelo Esforço",
    descricao: "Nada passa despercebido. Cada esforço, cada entrega acima da média é notado. E quando vemos dedicação verdadeira, você ganha vantagens reais: viagens, bônus e até porcentagem dos lucros.",
    icon: Trophy,
  },
  {
    numero: "08",
    titulo: "A Vitória Começa na Mente",
    descricao: "Aqui, transformamos visualização em disciplina prática: Sempre que iniciar um trabalho, pense na pessoa que você mais admira nessa área. Pergunte-se: 'Se fosse aquele gênio, o melhor copywriter, gestor ou editor, como ele executaria essa tarefa?' Primeiro acreditamos, depois conquistamos, porque toda vitória começa na mente.",
    icon: Brain,
    expandido: `
      <div class="space-y-2 mt-2 text-xs">
        <p><strong>Se você é Gestor de Tráfego:</strong> "O que devo ajustar para que essa campanha entregue ROI de 3x ou mais?"</p>
        <p><strong>Se você é Copywriter:</strong> "Como posso criar uma copy tão poderosa que se torne referência no mercado?"</p>
        <p><strong>Se você é Editor de Vídeos:</strong> "Como posso transformar esse criativo na versão mais impactante que já produzi?"</p>
      </div>
    `
  },
  {
    numero: "09",
    titulo: "Disciplina Gera Liberdade",
    descricao: "Não existe criatividade sem ordem, nem liberdade sem responsabilidade. Cumprimos processos, seguimos rotinas e entregamos com consistência. É a disciplina que nos dá o poder de criar sem limites.",
    icon: Shield,
  },
  {
    numero: "10",
    titulo: "Nada Menos que Excelência",
    descricao: "Não estamos aqui para ser medianos. Cada criativo, cada campanha, cada copy precisa carregar nossa marca de qualidade. A excelência não é um objetivo, é um padrão inegociável.",
    icon: Crown,
  }
]

export default function CulturaPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(7) // Mandamento 8 aberto por padrão (índice 7)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background fixo */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.h1 
            className="text-5xl md:text-6xl font-black mb-0.5 text-white"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.05em' }}
          >
            CULTURA
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-sm md:text-base text-gray-400 font-light"
          >
            Os 10 Mandamentos que Definem Nossa Essência
          </motion.p>
        </motion.div>
      </section>

      {/* Mandamentos Grid */}
      <section className="relative z-10 px-4 pt-4 pb-8 max-w-6xl mx-auto">
        <div className="grid gap-4 md:gap-6">
          {mandamentos.map((mandamento, index) => {
            const Icon = mandamento.icon
            const isExpanded = expandedIndex === index
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group relative"
              >
                
                <div className="relative bg-[#111111] border border-[#1a1a1a] rounded-lg p-4 md:p-6 hover:border-[#2a2a2a] transition-all duration-300">
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Número e Ícone */}
                    <div className="flex items-center gap-3">
                      <span className="text-4xl md:text-5xl font-black text-white">
                        {mandamento.numero}
                      </span>
                      <div className="p-2 rounded-lg bg-[#1a1a1a]">
                        <Icon className="w-5 h-5 text-[#666666]" />
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1">
                      <h2 className="text-xl md:text-2xl font-bold mb-2 text-[#007AFF]">
                        {mandamento.titulo}
                      </h2>
                      <p className="text-[#999999] text-sm md:text-base leading-relaxed">
                        {mandamento.descricao}
                      </p>
                      
                      {mandamento.expandido && (
                        <>
                          {!isExpanded && (
                            <button
                              onClick={() => setExpandedIndex(index)}
                              className="mt-2 text-xs text-[#666666] hover:text-white transition-colors"
                            >
                              Ver exemplos
                            </button>
                          )}
                          
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 text-[#888888] text-xs"
                              dangerouslySetInnerHTML={{ __html: mandamento.expandido }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="text-base md:text-lg font-light text-gray-400 mb-2">
            Estes são nossos princípios.
          </p>
          <p className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Esta é nossa cultura.
          </p>
        </motion.div>
      </footer>
    </div>
  )
}