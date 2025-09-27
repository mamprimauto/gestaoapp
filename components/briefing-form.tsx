"use client"

import { useState, useEffect } from "react"
import { X, Save, FileText } from "lucide-react"
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

interface Briefing {
  id?: string
  nome_produto: string
  categoria: string
  descricao_breve: string
  publico_alvo: string
  problema_resolve: string
  beneficios_principais: string
  diferencial_competitivo: string
  preco_sugerido: string
  canais_venda: string
  referencias_inspiracao: string
  tom_comunicacao: string
  palavras_chave: string
  restricoes_legais: string
  prazo_lancamento: string
  orcamento_marketing: string
  kpis_sucesso: string
  observacoes_extras: string
}

interface BriefingFormProps {
  briefing?: Briefing | null
  onSave: (data: Partial<Briefing>) => void
  onClose: () => void
}

const categorias = [
  "Emagrecimento",
  "Saúde", 
  "Beleza",
  "Fitness",
  "Nutrição",
  "Bem-estar",
  "Relacionamento",
  "Finanças",
  "Educação",
  "Tecnologia",
  "Outros"
]

const tons_comunicacao = [
  "Profissional e Técnico",
  "Informal e Amigável", 
  "Urgente e Persuasivo",
  "Educativo e Informativo",
  "Inspiracional e Motivador",
  "Exclusivo e Premium",
  "Descontraído e Divertido",
  "Confiável e Seguro"
]

export default function BriefingForm({ briefing, onSave, onClose }: BriefingFormProps) {
  const [formData, setFormData] = useState<Partial<Briefing>>({
    nome_produto: "",
    categoria: "",
    descricao_breve: "",
    publico_alvo: "",
    problema_resolve: "",
    beneficios_principais: "",
    diferencial_competitivo: "",
    preco_sugerido: "",
    canais_venda: "",
    referencias_inspiracao: "",
    tom_comunicacao: "",
    palavras_chave: "",
    restricoes_legais: "",
    prazo_lancamento: "",
    orcamento_marketing: "",
    kpis_sucesso: "",
    observacoes_extras: ""
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (briefing) {
      setFormData(briefing)
    }
  }, [briefing])

  const handleChange = (field: keyof Briefing, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome_produto?.trim()) {
      alert("Nome do produto é obrigatório")
      return
    }

    if (!formData.categoria?.trim()) {
      alert("Categoria é obrigatória")
      return
    }

    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-bold text-white">
              {briefing ? "Editar Briefing" : "Novo Briefing"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Seção 1: Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_produto" className="text-white">
                    Nome do Produto *
                  </Label>
                  <Input
                    id="nome_produto"
                    value={formData.nome_produto || ""}
                    onChange={(e) => handleChange("nome_produto", e.target.value)}
                    placeholder="Ex: NutraFit Pro"
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria" className="text-white">
                    Categoria *
                  </Label>
                  <Select 
                    value={formData.categoria || ""} 
                    onValueChange={(value) => handleChange("categoria", value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione uma categoria" />
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
                <Label htmlFor="descricao_breve" className="text-white">
                  Descrição Breve do Produto
                </Label>
                <Textarea
                  id="descricao_breve"
                  value={formData.descricao_breve || ""}
                  onChange={(e) => handleChange("descricao_breve", e.target.value)}
                  placeholder="Descreva o produto em poucas palavras..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>

            {/* Seção 2: Público e Mercado */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Público e Mercado
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="publico_alvo" className="text-white">
                  Público-Alvo
                </Label>
                <Textarea
                  id="publico_alvo"
                  value={formData.publico_alvo || ""}
                  onChange={(e) => handleChange("publico_alvo", e.target.value)}
                  placeholder="Defina o público-alvo (idade, gênero, interesses, problemas...)"
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problema_resolve" className="text-white">
                  Problema que Resolve
                </Label>
                <Textarea
                  id="problema_resolve"
                  value={formData.problema_resolve || ""}
                  onChange={(e) => handleChange("problema_resolve", e.target.value)}
                  placeholder="Qual problema específico o produto resolve?"
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>

            {/* Seção 3: Proposta de Valor */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Proposta de Valor
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="beneficios_principais" className="text-white">
                  Benefícios Principais
                </Label>
                <Textarea
                  id="beneficios_principais"
                  value={formData.beneficios_principais || ""}
                  onChange={(e) => handleChange("beneficios_principais", e.target.value)}
                  placeholder="Liste os principais benefícios do produto..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diferencial_competitivo" className="text-white">
                  Diferencial Competitivo
                </Label>
                <Textarea
                  id="diferencial_competitivo"
                  value={formData.diferencial_competitivo || ""}
                  onChange={(e) => handleChange("diferencial_competitivo", e.target.value)}
                  placeholder="O que diferencia este produto da concorrência?"
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>

            {/* Seção 4: Estratégia Comercial */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Estratégia Comercial
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco_sugerido" className="text-white">
                    Preço Sugerido
                  </Label>
                  <Input
                    id="preco_sugerido"
                    value={formData.preco_sugerido || ""}
                    onChange={(e) => handleChange("preco_sugerido", e.target.value)}
                    placeholder="Ex: R$ 97,00"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orcamento_marketing" className="text-white">
                    Orçamento de Marketing
                  </Label>
                  <Input
                    id="orcamento_marketing"
                    value={formData.orcamento_marketing || ""}
                    onChange={(e) => handleChange("orcamento_marketing", e.target.value)}
                    placeholder="Ex: R$ 10.000/mês"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canais_venda" className="text-white">
                  Canais de Venda
                </Label>
                <Textarea
                  id="canais_venda"
                  value={formData.canais_venda || ""}
                  onChange={(e) => handleChange("canais_venda", e.target.value)}
                  placeholder="Onde o produto será vendido? (site próprio, marketplaces, físico...)"
                  className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
                  rows={2}
                />
              </div>
            </div>

            {/* Seção 5: Comunicação */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Estratégia de Comunicação
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="tom_comunicacao" className="text-white">
                  Tom de Comunicação
                </Label>
                <Select 
                  value={formData.tom_comunicacao || ""} 
                  onValueChange={(value) => handleChange("tom_comunicacao", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecione o tom de comunicação" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {tons_comunicacao.map(tom => (
                      <SelectItem key={tom} value={tom}>
                        {tom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="palavras_chave" className="text-white">
                  Palavras-Chave
                </Label>
                <Textarea
                  id="palavras_chave"
                  value={formData.palavras_chave || ""}
                  onChange={(e) => handleChange("palavras_chave", e.target.value)}
                  placeholder="Liste palavras-chave relevantes separadas por vírgula..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencias_inspiracao" className="text-white">
                  Referências e Inspirações
                </Label>
                <Textarea
                  id="referencias_inspiracao"
                  value={formData.referencias_inspiracao || ""}
                  onChange={(e) => handleChange("referencias_inspiracao", e.target.value)}
                  placeholder="Links, marcas ou campanhas que podem servir de inspiração..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>

            {/* Seção 6: Planejamento e Controle */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Planejamento e Controle
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prazo_lancamento" className="text-white">
                    Prazo de Lançamento
                  </Label>
                  <Input
                    id="prazo_lancamento"
                    value={formData.prazo_lancamento || ""}
                    onChange={(e) => handleChange("prazo_lancamento", e.target.value)}
                    placeholder="Ex: 30 dias"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpis_sucesso" className="text-white">
                    KPIs de Sucesso
                  </Label>
                  <Input
                    id="kpis_sucesso"
                    value={formData.kpis_sucesso || ""}
                    onChange={(e) => handleChange("kpis_sucesso", e.target.value)}
                    placeholder="Ex: 100 vendas/mês, ROAS 3x"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restricoes_legais" className="text-white">
                  Restrições Legais
                </Label>
                <Textarea
                  id="restricoes_legais"
                  value={formData.restricoes_legais || ""}
                  onChange={(e) => handleChange("restricoes_legais", e.target.value)}
                  placeholder="Alguma restrição legal ou regulamentação a ser considerada?"
                  className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
                  rows={2}
                />
              </div>
            </div>

            {/* Seção 7: Observações */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Observações Adicionais
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="observacoes_extras" className="text-white">
                  Observações Extras
                </Label>
                <Textarea
                  id="observacoes_extras"
                  value={formData.observacoes_extras || ""}
                  onChange={(e) => handleChange("observacoes_extras", e.target.value)}
                  placeholder="Qualquer informação adicional relevante..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
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