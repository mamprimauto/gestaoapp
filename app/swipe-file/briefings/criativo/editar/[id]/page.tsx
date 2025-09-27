"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Save, FileText, Eye, Edit3 } from "lucide-react"
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

interface BriefingCriativoData {
  // Informações Básicas
  nome_projeto: string
  categoria: string
  descricao_breve: string
  
  // Top 10 Anúncios Escalados do Nicho
  top_10_anuncios_nicho: string
  estrutura_invisivel_nicho: string
  
  // Top 10 Anúncios de Nichos Similares
  top_10_anuncios_similares: string
  estrutura_invisivel_similares: string
  
  // Tendências Virais do Nicho
  formatos_anuncios_escalados: string
  formatos_anuncios_similares: string
  formatos_video_organico: string
  pontos_comuns_copy_nicho: string
  pontos_comuns_copy_similares: string
  principais_angulos_validados: string
  hooks_visuais_escalados: string
  
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

export default function EditarBriefingCriativoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [originalData, setOriginalData] = useState<BriefingCriativoData | null>(null)
  const [formData, setFormData] = useState<BriefingCriativoData>({
    // Informações Básicas
    nome_projeto: "",
    categoria: "",
    descricao_breve: "",
    
    // Top 10 Anúncios Escalados do Nicho
    top_10_anuncios_nicho: "",
    estrutura_invisivel_nicho: "",
    
    // Top 10 Anúncios de Nichos Similares
    top_10_anuncios_similares: "",
    estrutura_invisivel_similares: "",
    
    // Tendências Virais do Nicho
    formatos_anuncios_escalados: "",
    formatos_anuncios_similares: "",
    formatos_video_organico: "",
    pontos_comuns_copy_nicho: "",
    pontos_comuns_copy_similares: "",
    principais_angulos_validados: "",
    hooks_visuais_escalados: "",
    
    // Observações
    observacoes_extras: ""
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBriefing()
  }, [params.id])

  const loadBriefing = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("briefings_criativos")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) throw error

      if (data) {
        const briefingData = {
          nome_projeto: data.nome_projeto || "",
          categoria: data.categoria || "",
          descricao_breve: data.descricao_breve || "",
          top_10_anuncios_nicho: data.top_10_anuncios_nicho || "",
          estrutura_invisivel_nicho: data.estrutura_invisivel_nicho || "",
          top_10_anuncios_similares: data.top_10_anuncios_similares || "",
          estrutura_invisivel_similares: data.estrutura_invisivel_similares || "",
          formatos_anuncios_escalados: data.formatos_anuncios_escalados || "",
          formatos_anuncios_similares: data.formatos_anuncios_similares || "",
          formatos_video_organico: data.formatos_video_organico || "",
          pontos_comuns_copy_nicho: data.pontos_comuns_copy_nicho || "",
          pontos_comuns_copy_similares: data.pontos_comuns_copy_similares || "",
          principais_angulos_validados: data.principais_angulos_validados || "",
          hooks_visuais_escalados: data.hooks_visuais_escalados || "",
          observacoes_extras: data.observacoes_extras || ""
        }
        
        setFormData(briefingData)
        setOriginalData(briefingData)
      }
    } catch (error) {
      toast.error("Erro ao carregar briefing")
      router.push('/swipe-file/briefings')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof BriefingCriativoData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!formData.nome_projeto?.trim()) {
      toast.error("Nome do projeto é obrigatório")
      return
    }

    if (!formData.categoria?.trim()) {
      toast.error("Nicho é obrigatório")
      return
    }

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from("briefings_criativos")
        .update(formData)
        .eq("id", params.id)

      if (error) throw error

      setOriginalData(formData)
      setIsEditMode(false)
      toast.success("Briefing atualizado com sucesso!")
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData)
    }
    setIsEditMode(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b23] text-white">
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Carregando briefing...</p>
          </div>
        </div>
      </div>
    )
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
                <FileText className="h-6 w-6 text-blue-500" />
                <h1 className="text-xl font-bold text-white">
                  {isEditMode ? "Editando" : "Visualizando"} Briefing de Criativos
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditMode(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-8">
          {/* Seção 1: Informações Básicas */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Informações Básicas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome_projeto" className="text-white text-sm font-medium">
                  Nome do Projeto *
                </Label>
                {isEditMode ? (
                  <Input
                    id="nome_projeto"
                    value={formData.nome_projeto}
                    onChange={(e) => handleChange("nome_projeto", e.target.value)}
                    placeholder="Ex: Criativos Diabetes 2024"
                    className="bg-gray-800 border-gray-700 text-white h-12"
                    required
                  />
                ) : (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 h-12 flex items-center text-white">
                    {formData.nome_projeto}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-white text-sm font-medium">
                  Nicho *
                </Label>
                {isEditMode ? (
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
                ) : (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 h-12 flex items-center text-white">
                    {formData.categoria}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_breve" className="text-white text-sm font-medium">
                Descrição Breve do Projeto
              </Label>
              {isEditMode ? (
                <Textarea
                  id="descricao_breve"
                  value={formData.descricao_breve}
                  onChange={(e) => handleChange("descricao_breve", e.target.value)}
                  placeholder="Descreva o projeto de criativos em poucas palavras..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[100px] text-white whitespace-pre-wrap">
                  {formData.descricao_breve}
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Top 10 Anúncios Escalados do Nicho */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Top 10 Anúncios Escalados do Nicho
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="top_10_anuncios_nicho" className="text-white text-sm font-medium">
                Top 10 Anúncios Mais Escalados
              </Label>
              {isEditMode ? (
                <Textarea
                  id="top_10_anuncios_nicho"
                  value={formData.top_10_anuncios_nicho}
                  onChange={(e) => handleChange("top_10_anuncios_nicho", e.target.value)}
                  placeholder="Coloque aqui o top 10 anúncios mais escalados que você encontrou nesse nicho..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[200px]"
                  rows={8}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[200px] text-white whitespace-pre-wrap">
                  {formData.top_10_anuncios_nicho}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estrutura_invisivel_nicho" className="text-white text-sm font-medium">
                Estrutura Invisível dos Anúncios
              </Label>
              {isEditMode ? (
                <Textarea
                  id="estrutura_invisivel_nicho"
                  value={formData.estrutura_invisivel_nicho}
                  onChange={(e) => handleChange("estrutura_invisivel_nicho", e.target.value)}
                  placeholder="Extrair toda a Estrutura Invisível incluindo Hook visual que foi utilizado, além de ângulo e formato de cada um..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[200px]"
                  rows={8}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[200px] text-white whitespace-pre-wrap">
                  {formData.estrutura_invisivel_nicho}
                </div>
              )}
            </div>
          </div>

          {/* Seção 3: Top 10 Anúncios de Nichos Similares */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Top 10 Anúncios de Nichos Similares
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="top_10_anuncios_similares" className="text-white text-sm font-medium">
                Top 10 Anúncios Mais Escalados em Nichos Similares
              </Label>
              {isEditMode ? (
                <Textarea
                  id="top_10_anuncios_similares"
                  value={formData.top_10_anuncios_similares}
                  onChange={(e) => handleChange("top_10_anuncios_similares", e.target.value)}
                  placeholder="Coloque aqui o top 10 anúncios mais escalados que você encontrou em nichos similares..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[200px]"
                  rows={8}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[200px] text-white whitespace-pre-wrap">
                  {formData.top_10_anuncios_similares}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estrutura_invisivel_similares" className="text-white text-sm font-medium">
                Estrutura Invisível dos Anúncios Similares
              </Label>
              {isEditMode ? (
                <Textarea
                  id="estrutura_invisivel_similares"
                  value={formData.estrutura_invisivel_similares}
                  onChange={(e) => handleChange("estrutura_invisivel_similares", e.target.value)}
                  placeholder="Extrair toda a Estrutura Invisível incluindo Hook visual que foi utilizado, além de ângulo e formato de cada um..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[200px]"
                  rows={8}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[200px] text-white whitespace-pre-wrap">
                  {formData.estrutura_invisivel_similares}
                </div>
              )}
            </div>
          </div>

          {/* Seção 4: Tendências Virais do Nicho */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Tendências Virais do Nicho
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="formatos_anuncios_escalados" className="text-white text-sm font-medium">
                  Principais Formatos dos Anúncios Escalados do Nicho
                </Label>
                {isEditMode ? (
                  <Textarea
                    id="formatos_anuncios_escalados"
                    value={formData.formatos_anuncios_escalados}
                    onChange={(e) => handleChange("formatos_anuncios_escalados", e.target.value)}
                    placeholder="Ex: UGC, Depoimentos, etc..."
                    className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                    rows={5}
                  />
                ) : (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[120px] text-white whitespace-pre-wrap">
                    {formData.formatos_anuncios_escalados}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="formatos_anuncios_similares" className="text-white text-sm font-medium">
                  Principais Formatos dos Anúncios de Nichos Similares
                </Label>
                {isEditMode ? (
                  <Textarea
                    id="formatos_anuncios_similares"
                    value={formData.formatos_anuncios_similares}
                    onChange={(e) => handleChange("formatos_anuncios_similares", e.target.value)}
                    placeholder="Ex: UGC, Depoimentos, etc..."
                    className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                    rows={5}
                  />
                ) : (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[120px] text-white whitespace-pre-wrap">
                    {formData.formatos_anuncios_similares}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formatos_video_organico" className="text-white text-sm font-medium">
                Principais Formatos de Vídeo Orgânico que Estão Viralizando
              </Label>
              {isEditMode ? (
                <Textarea
                  id="formatos_video_organico"
                  value={formData.formatos_video_organico}
                  onChange={(e) => handleChange("formatos_video_organico", e.target.value)}
                  placeholder="Ex: UGC, Vídeo de Curiosidade, etc..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                  rows={5}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[120px] text-white whitespace-pre-wrap">
                  {formData.formatos_video_organico}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pontos_comuns_copy_nicho" className="text-white text-sm font-medium">
                  Pontos em Comum na Copy dos Anúncios do Nicho
                </Label>
                {isEditMode ? (
                  <Textarea
                    id="pontos_comuns_copy_nicho"
                    value={formData.pontos_comuns_copy_nicho}
                    onChange={(e) => handleChange("pontos_comuns_copy_nicho", e.target.value)}
                    placeholder="Ex: Todos apresentam pesquisa revolucionária, são conspiracionistas, batem na indústria farmacêutica..."
                    className="bg-gray-800 border-gray-700 text-white min-h-[150px]"
                    rows={6}
                  />
                ) : (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[150px] text-white whitespace-pre-wrap">
                    {formData.pontos_comuns_copy_nicho}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pontos_comuns_copy_similares" className="text-white text-sm font-medium">
                  Pontos em Comum na Copy dos Anúncios Similares
                </Label>
                {isEditMode ? (
                  <Textarea
                    id="pontos_comuns_copy_similares"
                    value={formData.pontos_comuns_copy_similares}
                    onChange={(e) => handleChange("pontos_comuns_copy_similares", e.target.value)}
                    placeholder="Ex: Batem numa crença específica, batem em sintomas secundários, focam no medo principal..."
                    className="bg-gray-800 border-gray-700 text-white min-h-[150px]"
                    rows={6}
                  />
                ) : (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[150px] text-white whitespace-pre-wrap">
                    {formData.pontos_comuns_copy_similares}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="principais_angulos_validados" className="text-white text-sm font-medium">
                Principais Ângulos que Validaram e Hooks Utilizados
              </Label>
              {isEditMode ? (
                <Textarea
                  id="principais_angulos_validados"
                  value={formData.principais_angulos_validados}
                  onChange={(e) => handleChange("principais_angulos_validados", e.target.value)}
                  placeholder="Ex: Ângulo Contrarian + Alerta Urgente - Hook: 'Joguei meu Zepbound no lixo, me empanturrei de doces e perdi 12 kg depois que descobri essa farsa da indústria farmacêutica.'"
                  className="bg-gray-800 border-gray-700 text-white min-h-[150px]"
                  rows={6}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[150px] text-white whitespace-pre-wrap">
                  {formData.principais_angulos_validados}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hooks_visuais_escalados" className="text-white text-sm font-medium">
                Principais Hooks Visuais dos Ads Escalados/Conteúdos Virais
              </Label>
              {isEditMode ? (
                <Textarea
                  id="hooks_visuais_escalados"
                  value={formData.hooks_visuais_escalados}
                  onChange={(e) => handleChange("hooks_visuais_escalados", e.target.value)}
                  placeholder="Ex: Receitas com Baking Soda, Receitas com Apple Vinegar, Doces e Comidas Gordurosas, Vídeos estranhos de pé, Vídeos de Coca-Cola..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[150px]"
                  rows={6}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[150px] text-white whitespace-pre-wrap">
                  {formData.hooks_visuais_escalados}
                </div>
              )}
            </div>
          </div>

          {/* Seção 5: Observações */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white border-b border-gray-700 pb-3">
              Observações Adicionais
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="observacoes_extras" className="text-white text-sm font-medium">
                Observações Extras
              </Label>
              {isEditMode ? (
                <Textarea
                  id="observacoes_extras"
                  value={formData.observacoes_extras}
                  onChange={(e) => handleChange("observacoes_extras", e.target.value)}
                  placeholder="Qualquer informação adicional relevante sobre os criativos..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  rows={4}
                />
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-3 min-h-[100px] text-white whitespace-pre-wrap">
                  {formData.observacoes_extras}
                </div>
              )}
            </div>
          </div>

          {/* Botões mobile */}
          {isEditMode && (
            <div className="pt-6 border-t border-gray-800 md:hidden">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-800 text-white border-gray-700 hover:bg-gray-700 h-12"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}