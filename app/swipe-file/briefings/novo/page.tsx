"use client"

import { useState } from "react"
import { ArrowLeft, Save, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface BriefingData {
  // Informações Básicas
  nome_produto: string
  categoria: string
  descricao_breve: string
  
  // Análise de Mercado
  mercado_alvo: string
  tendencia_conteudo: string
  tendencia_consumo: string
  tendencia_marketing: string
  
  // Mecanismos e Estratégia
  mecanismos_campeoes: string
  mecanismo_adaptacao: string
  mecanismo_problema: string
  mecanismo_solucao: string
  
  // Big Idea e Copy
  big_idea_formato: string
  historia_conspiracionista: string
  perguntas_paradoxais: string
  nome_chiclete: string
  
  // Público e Mercado (expandido)
  publico_alvo: string
  problema_resolve: string
  
  // Demografia e Psicologia
  atitudes_publico: string
  esperancas_sonhos: string
  dores_medos: string
  vitorias_fracassos: string
  inimigo_externo: string
  preconceitos: string
  crencas_fundamentais: string
  
  // Proposta de Valor (expandido)
  beneficios_principais: string
  diferencial_competitivo: string
  beneficios_multiplos: string
  ingredientes_entregaveis: string
  
  // Análise Competitiva
  solucoes_existentes: string
  experiencia_produtos: string
  gostam_solucoes: string
  nao_gostam_solucoes: string
  historias_terror: string
  
  // Estratégia Comercial (expandido)
  preco_sugerido: string
  orcamento_marketing: string
  canais_venda: string
  garantia: string
  bonus: string
  
  // Comunicação (expandido)
  tom_comunicacao: string
  palavras_chave: string
  referencias_inspiracao: string
  bullets_headlines: string
  
  // Storytelling e Leads
  historia_produto: string
  leads_blockbusters: string
  leads_modelados: string
  nivel_consciencia: string
  nivel_sofisticacao: string
  
  // Planejamento e Controle
  prazo_lancamento: string
  kpis_sucesso: string
  restricoes_legais: string
  
  // Observações
  observacoes_extras: string
}

const categorias = [
  "Emagrecimento",
  "Memória",
  "Dor nos Ouvidos",
  "Diabetes",
  "Hipertensão",
  "Colesterol",
  "Artrite",
  "Varizes",
  "Cabelos",
  "Unhas",
  "Pele",
  "Próstata",
  "Menopausa",
  "Libido",
  "Ansiedade",
  "Insônia",
  "Digestão",
  "Imunidade",
  "Energia",
  "Detox",
  "Anti-idade",
  "Visão",
  "Audição",
  "Respiração",
  "Circulação",
  "Músculos",
  "Articulações",
  "Outros"
]




export default function NovoBriefingPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<BriefingData>({
    // Informações Básicas
    nome_produto: "",
    categoria: "",
    descricao_breve: "",
    
    // Análise de Mercado
    mercado_alvo: "",
    tendencia_conteudo: "",
    tendencia_consumo: "",
    tendencia_marketing: "",
    
    // Mecanismos e Estratégia
    mecanismos_campeoes: "",
    mecanismo_adaptacao: "",
    mecanismo_problema: "",
    mecanismo_solucao: "",
    
    // Big Idea e Copy
    big_idea_formato: "",
    historia_conspiracionista: "",
    perguntas_paradoxais: "",
    nome_chiclete: "",
    
    // Público e Mercado
    publico_alvo: "",
    problema_resolve: "",
    
    // Demografia e Psicologia
    atitudes_publico: "",
    esperancas_sonhos: "",
    dores_medos: "",
    vitorias_fracassos: "",
    inimigo_externo: "",
    preconceitos: "",
    crencas_fundamentais: "",
    
    // Proposta de Valor
    beneficios_principais: "",
    diferencial_competitivo: "",
    beneficios_multiplos: "",
    ingredientes_entregaveis: "",
    
    // Análise Competitiva
    solucoes_existentes: "",
    experiencia_produtos: "",
    gostam_solucoes: "",
    nao_gostam_solucoes: "",
    historias_terror: "",
    
    // Estratégia Comercial
    preco_sugerido: "",
    orcamento_marketing: "",
    canais_venda: "",
    garantia: "",
    bonus: "",
    
    // Comunicação
    tom_comunicacao: "",
    palavras_chave: "",
    referencias_inspiracao: "",
    bullets_headlines: "",
    
    // Storytelling e Leads
    historia_produto: "",
    leads_blockbusters: "",
    leads_modelados: "",
    nivel_consciencia: "",
    nivel_sofisticacao: "",
    
    // Planejamento e Controle
    prazo_lancamento: "",
    kpis_sucesso: "",
    restricoes_legais: "",
    
    // Observações
    observacoes_extras: ""
  })

  const [loading, setLoading] = useState(false)

  const handleChange = (field: keyof BriefingData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome_produto?.trim()) {
      toast.error("Nome do produto é obrigatório")
      return
    }

    if (!formData.categoria?.trim()) {
      toast.error("Nicho é obrigatório")
      return
    }

    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from("briefings")
        .insert(formData)

      if (error) throw error

      toast.success("Briefing criado com sucesso!")
      router.push('/swipe-file/briefings')
    } catch (error: any) {
      if (error.code === '42P01') {
        toast.error("Tabela briefings não existe. Execute o script SQL no Supabase.")
      } else {
        toast.error(`Erro: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1b23] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/swipe-file/briefings')}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Briefings
              </Button>
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-green-500" />
                <h1 className="text-xl font-bold text-white">Novo Briefing</h1>
              </div>
            </div>
            <Button
              type="submit"
              form="briefing-form"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Briefing"}
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <form id="briefing-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Informações Básicas */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Informações Básicas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome_produto" className="text-white text-sm font-medium">
                  Nome do Produto *
                </Label>
                <Input
                  id="nome_produto"
                  value={formData.nome_produto}
                  onChange={(e) => handleChange("nome_produto", e.target.value)}
                  placeholder="Ex: NutraFit Pro"
                  className="bg-gray-800 border-gray-700 text-white h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-white text-sm font-medium">
                  Nicho *
                </Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(value) => handleChange("categoria", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-12">
                    <SelectValue placeholder="Selecione um nicho" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {categorias.map(categoria => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_breve" className="text-white text-sm font-medium">
                Descrição Breve do Produto
              </Label>
              <Textarea
                id="descricao_breve"
                value={formData.descricao_breve}
                onChange={(e) => handleChange("descricao_breve", e.target.value)}
                placeholder="Descreva o produto em poucas palavras..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Seção 2: Público e Mercado */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Público e Mercado
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="publico_alvo" className="text-white text-sm font-medium">
                Público-Alvo
              </Label>
              <Textarea
                id="publico_alvo"
                value={formData.publico_alvo}
                onChange={(e) => handleChange("publico_alvo", e.target.value)}
                placeholder="Defina o público-alvo (idade, gênero, interesses, problemas...)"
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problema_resolve" className="text-white text-sm font-medium">
                Problema que Resolve
              </Label>
              <Textarea
                id="problema_resolve"
                value={formData.problema_resolve}
                onChange={(e) => handleChange("problema_resolve", e.target.value)}
                placeholder="Qual problema específico o produto resolve?"
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Seção 3: Análise de Mercado */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Análise de Mercado
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="mercado_alvo" className="text-white text-sm font-medium">
                Mercado Alvo
              </Label>
              <Textarea
                id="mercado_alvo"
                value={formData.mercado_alvo}
                onChange={(e) => handleChange("mercado_alvo", e.target.value)}
                placeholder="Descrição detalhada do mercado-alvo..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tendencia_conteudo" className="text-white text-sm font-medium">
                  Tendência de Conteúdo
                </Label>
                <Textarea
                  id="tendencia_conteudo"
                  value={formData.tendencia_conteudo}
                  onChange={(e) => handleChange("tendencia_conteudo", e.target.value)}
                  placeholder="Tendências no tipo de conteúdo..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tendencia_consumo" className="text-white text-sm font-medium">
                  Tendência de Consumo
                </Label>
                <Textarea
                  id="tendencia_consumo"
                  value={formData.tendencia_consumo}
                  onChange={(e) => handleChange("tendencia_consumo", e.target.value)}
                  placeholder="Como o público consome..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tendencia_marketing" className="text-white text-sm font-medium">
                  Tendência de Marketing
                </Label>
                <Textarea
                  id="tendencia_marketing"
                  value={formData.tendencia_marketing}
                  onChange={(e) => handleChange("tendencia_marketing", e.target.value)}
                  placeholder="Estratégias de marketing em alta..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Mecanismos e Estratégia */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Mecanismos e Estratégia
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mecanismos_campeoes" className="text-white text-sm font-medium">
                  Mecanismos Campeões
                </Label>
                <Textarea
                  id="mecanismos_campeoes"
                  value={formData.mecanismos_campeoes}
                  onChange={(e) => handleChange("mecanismos_campeoes", e.target.value)}
                  placeholder="Principais mecanismos que geram resultados..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mecanismo_adaptacao" className="text-white text-sm font-medium">
                  Mecanismo de Adaptação
                </Label>
                <Textarea
                  id="mecanismo_adaptacao"
                  value={formData.mecanismo_adaptacao}
                  onChange={(e) => handleChange("mecanismo_adaptacao", e.target.value)}
                  placeholder="Como o produto se adapta às necessidades..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mecanismo_problema" className="text-white text-sm font-medium">
                  Mecanismo do Problema
                </Label>
                <Textarea
                  id="mecanismo_problema"
                  value={formData.mecanismo_problema}
                  onChange={(e) => handleChange("mecanismo_problema", e.target.value)}
                  placeholder="Como o problema funciona/surge..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mecanismo_solucao" className="text-white text-sm font-medium">
                  Mecanismo da Solução
                </Label>
                <Textarea
                  id="mecanismo_solucao"
                  value={formData.mecanismo_solucao}
                  onChange={(e) => handleChange("mecanismo_solucao", e.target.value)}
                  placeholder="Como a solução funciona..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Seção 5: Big Idea e Copy */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Big Idea e Copy
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="big_idea_formato" className="text-white text-sm font-medium">
                Formato da Big Idea
              </Label>
              <Textarea
                id="big_idea_formato"
                value={formData.big_idea_formato}
                onChange={(e) => handleChange("big_idea_formato", e.target.value)}
                placeholder="Descreva o formato da big idea..."
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="historia_conspiracionista" className="text-white text-sm font-medium">
                  História Conspiracionista
                </Label>
                <Textarea
                  id="historia_conspiracionista"
                  value={formData.historia_conspiracionista}
                  onChange={(e) => handleChange("historia_conspiracionista", e.target.value)}
                  placeholder="Narrativa de conspiração ou revelação..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="perguntas_paradoxais" className="text-white text-sm font-medium">
                  Perguntas Paradoxais
                </Label>
                <Textarea
                  id="perguntas_paradoxais"
                  value={formData.perguntas_paradoxais}
                  onChange={(e) => handleChange("perguntas_paradoxais", e.target.value)}
                  placeholder="Perguntas que geram curiosidade..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome_chiclete" className="text-white text-sm font-medium">
                Nome Chiclete
              </Label>
              <Input
                id="nome_chiclete"
                value={formData.nome_chiclete}
                onChange={(e) => handleChange("nome_chiclete", e.target.value)}
                placeholder="Nome marcante e grudento..."
                className="bg-gray-800 border-gray-700 text-white h-12"
              />
            </div>
          </div>

          {/* Seção 6: Demografia e Psicologia */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Demografia e Psicologia
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="atitudes_publico" className="text-white text-sm font-medium">
                  Atitudes do Público
                </Label>
                <Textarea
                  id="atitudes_publico"
                  value={formData.atitudes_publico}
                  onChange={(e) => handleChange("atitudes_publico", e.target.value)}
                  placeholder="Como o público se comporta e pensa..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="esperancas_sonhos" className="text-white text-sm font-medium">
                  Esperanças e Sonhos
                </Label>
                <Textarea
                  id="esperancas_sonhos"
                  value={formData.esperancas_sonhos}
                  onChange={(e) => handleChange("esperancas_sonhos", e.target.value)}
                  placeholder="O que o público deseja alcançar..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dores_medos" className="text-white text-sm font-medium">
                  Dores e Medos
                </Label>
                <Textarea
                  id="dores_medos"
                  value={formData.dores_medos}
                  onChange={(e) => handleChange("dores_medos", e.target.value)}
                  placeholder="Principais dores e medos do público..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vitorias_fracassos" className="text-white text-sm font-medium">
                  Vitórias e Fracassos
                </Label>
                <Textarea
                  id="vitorias_fracassos"
                  value={formData.vitorias_fracassos}
                  onChange={(e) => handleChange("vitorias_fracassos", e.target.value)}
                  placeholder="Experiências passadas do público..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="inimigo_externo" className="text-white text-sm font-medium">
                  Inimigo Externo
                </Label>
                <Textarea
                  id="inimigo_externo"
                  value={formData.inimigo_externo}
                  onChange={(e) => handleChange("inimigo_externo", e.target.value)}
                  placeholder="Quem/o que é o vilão..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preconceitos" className="text-white text-sm font-medium">
                  Preconceitos
                </Label>
                <Textarea
                  id="preconceitos"
                  value={formData.preconceitos}
                  onChange={(e) => handleChange("preconceitos", e.target.value)}
                  placeholder="Preconceitos e objeções..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="crencas_fundamentais" className="text-white text-sm font-medium">
                  Crenças Fundamentais
                </Label>
                <Textarea
                  id="crencas_fundamentais"
                  value={formData.crencas_fundamentais}
                  onChange={(e) => handleChange("crencas_fundamentais", e.target.value)}
                  placeholder="Crenças básicas do público..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Seção 7: Proposta de Valor */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Proposta de Valor
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="beneficios_principais" className="text-white text-sm font-medium">
                Benefícios Principais
              </Label>
              <Textarea
                id="beneficios_principais"
                value={formData.beneficios_principais}
                onChange={(e) => handleChange("beneficios_principais", e.target.value)}
                placeholder="Liste os principais benefícios do produto..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="diferencial_competitivo" className="text-white text-sm font-medium">
                  Diferencial Competitivo
                </Label>
                <Textarea
                  id="diferencial_competitivo"
                  value={formData.diferencial_competitivo}
                  onChange={(e) => handleChange("diferencial_competitivo", e.target.value)}
                  placeholder="O que diferencia este produto da concorrência?"
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="beneficios_multiplos" className="text-white text-sm font-medium">
                  Benefícios Múltiplos
                </Label>
                <Textarea
                  id="beneficios_multiplos"
                  value={formData.beneficios_multiplos}
                  onChange={(e) => handleChange("beneficios_multiplos", e.target.value)}
                  placeholder="Lista completa de benefícios..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredientes_entregaveis" className="text-white text-sm font-medium">
                Ingredientes e Entregáveis
              </Label>
              <Textarea
                id="ingredientes_entregaveis"
                value={formData.ingredientes_entregaveis}
                onChange={(e) => handleChange("ingredientes_entregaveis", e.target.value)}
                placeholder="O que compõe o produto e o que será entregue..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Seção 8: Análise Competitiva */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Análise Competitiva
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="solucoes_existentes" className="text-white text-sm font-medium">
                Soluções Existentes
              </Label>
              <Textarea
                id="solucoes_existentes"
                value={formData.solucoes_existentes}
                onChange={(e) => handleChange("solucoes_existentes", e.target.value)}
                placeholder="Quais soluções já existem no mercado..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="experiencia_produtos" className="text-white text-sm font-medium">
                  Experiência com Produtos
                </Label>
                <Textarea
                  id="experiencia_produtos"
                  value={formData.experiencia_produtos}
                  onChange={(e) => handleChange("experiencia_produtos", e.target.value)}
                  placeholder="Qual experiência o público tem com produtos similares..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gostam_solucoes" className="text-white text-sm font-medium">
                  Do que Gostam nas Soluções
                </Label>
                <Textarea
                  id="gostam_solucoes"
                  value={formData.gostam_solucoes}
                  onChange={(e) => handleChange("gostam_solucoes", e.target.value)}
                  placeholder="O que o público valoriza nas soluções atuais..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nao_gostam_solucoes" className="text-white text-sm font-medium">
                  Do que Não Gostam nas Soluções
                </Label>
                <Textarea
                  id="nao_gostam_solucoes"
                  value={formData.nao_gostam_solucoes}
                  onChange={(e) => handleChange("nao_gostam_solucoes", e.target.value)}
                  placeholder="Principais reclamações sobre soluções existentes..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="historias_terror" className="text-white text-sm font-medium">
                  Histórias de Terror
                </Label>
                <Textarea
                  id="historias_terror"
                  value={formData.historias_terror}
                  onChange={(e) => handleChange("historias_terror", e.target.value)}
                  placeholder="Experiências negativas que o público teve..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Seção 9: Oferta Detalhada */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Oferta Detalhada
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="garantia" className="text-white text-sm font-medium">
                  Garantia
                </Label>
                <Textarea
                  id="garantia"
                  value={formData.garantia}
                  onChange={(e) => handleChange("garantia", e.target.value)}
                  placeholder="Detalhes da garantia oferecida..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonus" className="text-white text-sm font-medium">
                  Bônus
                </Label>
                <Textarea
                  id="bonus"
                  value={formData.bonus}
                  onChange={(e) => handleChange("bonus", e.target.value)}
                  placeholder="Bônus incluídos na oferta..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bullets_headlines" className="text-white text-sm font-medium">
                Bullets e Headlines
              </Label>
              <Textarea
                id="bullets_headlines"
                value={formData.bullets_headlines}
                onChange={(e) => handleChange("bullets_headlines", e.target.value)}
                placeholder="Bullets persuasivos e headlines de impacto..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Seção 10: Storytelling e Leads */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Storytelling e Leads
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="historia_produto" className="text-white text-sm font-medium">
                História do Produto
              </Label>
              <Textarea
                id="historia_produto"
                value={formData.historia_produto}
                onChange={(e) => handleChange("historia_produto", e.target.value)}
                placeholder="A história por trás do produto..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="leads_blockbusters" className="text-white text-sm font-medium">
                  Leads Blockbusters
                </Label>
                <Textarea
                  id="leads_blockbusters"
                  value={formData.leads_blockbusters}
                  onChange={(e) => handleChange("leads_blockbusters", e.target.value)}
                  placeholder="Leads de grande impacto e autoridade..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leads_modelados" className="text-white text-sm font-medium">
                  Leads Modelados
                </Label>
                <Textarea
                  id="leads_modelados"
                  value={formData.leads_modelados}
                  onChange={(e) => handleChange("leads_modelados", e.target.value)}
                  placeholder="Leads baseados em cases de sucesso..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nivel_consciencia" className="text-white text-sm font-medium">
                  Nível de Consciência
                </Label>
                <Textarea
                  id="nivel_consciencia"
                  value={formData.nivel_consciencia}
                  onChange={(e) => handleChange("nivel_consciencia", e.target.value)}
                  placeholder="Qual o nível de consciência do público sobre o problema..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivel_sofisticacao" className="text-white text-sm font-medium">
                  Nível de Sofisticação
                </Label>
                <Textarea
                  id="nivel_sofisticacao"
                  value={formData.nivel_sofisticacao}
                  onChange={(e) => handleChange("nivel_sofisticacao", e.target.value)}
                  placeholder="Qual o nível de sofisticação do mercado..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </div>


          {/* Seção 11: Comunicação */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Estratégia de Comunicação
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="tom_comunicacao" className="text-white text-sm font-medium">
                Tom de Comunicação
              </Label>
              <Textarea
                id="tom_comunicacao"
                value={formData.tom_comunicacao}
                onChange={(e) => handleChange("tom_comunicacao", e.target.value)}
                placeholder="Descreva o tom de comunicação desejado..."
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="palavras_chave" className="text-white text-sm font-medium">
                Palavras-Chave
              </Label>
              <Textarea
                id="palavras_chave"
                value={formData.palavras_chave}
                onChange={(e) => handleChange("palavras_chave", e.target.value)}
                placeholder="Liste palavras-chave relevantes separadas por vírgula..."
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referencias_inspiracao" className="text-white text-sm font-medium">
                Referências e Inspirações
              </Label>
              <Textarea
                id="referencias_inspiracao"
                value={formData.referencias_inspiracao}
                onChange={(e) => handleChange("referencias_inspiracao", e.target.value)}
                placeholder="Links, marcas ou campanhas que podem servir de inspiração..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>
          </div>


          {/* Seção 12: Observações */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Observações Adicionais
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="observacoes_extras" className="text-white text-sm font-medium">
                Observações Extras
              </Label>
              <Textarea
                id="observacoes_extras"
                value={formData.observacoes_extras}
                onChange={(e) => handleChange("observacoes_extras", e.target.value)}
                placeholder="Qualquer informação adicional relevante..."
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Botão de submit mobile */}
          <div className="pt-6 border-t border-gray-800">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12 md:hidden"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Briefing"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}