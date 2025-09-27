"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit2, Trash2, FileText, ArrowLeft, Calendar, User, Tag, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

interface Briefing {
  id: string
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
  created_at: string
  updated_at: string
  user_id?: string
  tipo?: string
}

interface BriefingCriativo {
  id: string
  nome_projeto: string
  categoria: string
  descricao_breve: string
  top_10_anuncios_nicho: string
  estrutura_invisivel_nicho: string
  top_10_anuncios_similares: string
  estrutura_invisivel_similares: string
  formatos_anuncios_escalados: string
  formatos_anuncios_similares: string
  formatos_video_organico: string
  pontos_comuns_copy_nicho: string
  pontos_comuns_copy_similares: string
  principais_angulos_validados: string
  hooks_visuais_escalados: string
  observacoes_extras: string
  created_at: string
  updated_at: string
  user_id?: string
  tipo?: string
}

type BriefingItem = Briefing | BriefingCriativo

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

const categoriaColors: Record<string, string> = {
  "Emagrecimento": "bg-green-500/20 text-green-400 border-green-500/50",
  "Memória": "bg-purple-500/20 text-purple-400 border-purple-500/50",
  "Dor nos Ouvidos": "bg-red-500/20 text-red-400 border-red-500/50",
  "Diabetes": "bg-blue-500/20 text-blue-400 border-blue-500/50",
  "Hipertensão": "bg-red-600/20 text-red-400 border-red-600/50",
  "Colesterol": "bg-orange-500/20 text-orange-400 border-orange-500/50",
  "Artrite": "bg-amber-500/20 text-amber-400 border-amber-500/50",
  "Varizes": "bg-indigo-500/20 text-indigo-400 border-indigo-500/50",
  "Cabelos": "bg-pink-500/20 text-pink-400 border-pink-500/50",
  "Unhas": "bg-rose-500/20 text-rose-400 border-rose-500/50",
  "Pele": "bg-pink-600/20 text-pink-400 border-pink-600/50",
  "Próstata": "bg-teal-500/20 text-teal-400 border-teal-500/50",
  "Menopausa": "bg-violet-500/20 text-violet-400 border-violet-500/50",
  "Libido": "bg-red-500/20 text-red-400 border-red-500/50",
  "Ansiedade": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  "Insônia": "bg-slate-500/20 text-slate-400 border-slate-500/50",
  "Digestão": "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  "Imunidade": "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  "Energia": "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
  "Detox": "bg-lime-500/20 text-lime-400 border-lime-500/50",
  "Anti-idade": "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50",
  "Visão": "bg-sky-500/20 text-sky-400 border-sky-500/50",
  "Audição": "bg-orange-600/20 text-orange-400 border-orange-600/50",
  "Respiração": "bg-teal-600/20 text-teal-400 border-teal-600/50",
  "Circulação": "bg-red-700/20 text-red-400 border-red-700/50",
  "Músculos": "bg-stone-500/20 text-stone-400 border-stone-500/50",
  "Articulações": "bg-amber-600/20 text-amber-400 border-amber-600/50",
  "Outros": "bg-gray-500/20 text-gray-400 border-gray-500/50"
}

export default function BriefingsPage() {
  const router = useRouter()
  const [briefings, setBriefings] = useState<BriefingItem[]>([])
  const [filteredBriefings, setFilteredBriefings] = useState<BriefingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all")
  const [deletingBriefing, setDeletingBriefing] = useState<BriefingItem | null>(null)
  const [showBriefingTypeModal, setShowBriefingTypeModal] = useState(false)

  useEffect(() => {
    loadBriefings()
  }, [])

  useEffect(() => {
    filterBriefings()
  }, [searchTerm, selectedCategoria, briefings])

  const loadBriefings = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Carregar briefings VSL
      const { data: briefingsVSL, error: errorVSL } = await supabase
        .from("briefings")
        .select("*")
        .order("created_at", { ascending: false })

      // Carregar briefings criativos
      const { data: briefingsCreativos, error: errorCreativo } = await supabase
        .from("briefings_criativos")
        .select("*")
        .order("created_at", { ascending: false })

      if (errorVSL && errorVSL.code !== '42P01') throw errorVSL

      // Combinar os dois tipos de briefing
      const allBriefings: BriefingItem[] = [
        ...(briefingsVSL || []).map(briefing => ({ ...briefing, tipo: 'VSL' })),
        ...(briefingsCreativos || []).map(briefing => ({ ...briefing, tipo: 'Criativo' }))
      ]

      // Ordenar por data de criação
      allBriefings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setBriefings(allBriefings)
    } catch (error) {
      toast.error("Erro ao carregar briefings")
    } finally {
      setLoading(false)
    }
  }

  const filterBriefings = () => {
    let filtered = [...briefings]

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(briefing => {
        const nome = 'nome_produto' in briefing ? briefing.nome_produto : briefing.nome_projeto
        return (
          nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          briefing.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
          briefing.descricao_breve.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    // Filtro por categoria
    if (selectedCategoria !== "all") {
      filtered = filtered.filter(briefing => briefing.categoria === selectedCategoria)
    }

    setFilteredBriefings(filtered)
  }


  const handleDelete = async () => {
    if (!deletingBriefing) return

    try {
      const supabase = await getSupabaseClient()
      
      const tableName = deletingBriefing.tipo === 'VSL' ? 'briefings' : 'briefings_criativos'
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", deletingBriefing.id)

      if (error) throw error

      toast.success("Briefing removido com sucesso!")
      await loadBriefings()
    } catch (error) {
      toast.error("Erro ao remover briefing")
    } finally {
      setDeletingBriefing(null)
    }
  }

  const uniqueCategorias = Array.from(new Set(briefings.map(b => b.categoria)))

  return (
    <div className="min-h-screen bg-[#1a1b23] text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/swipe-file')}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Pesquisa & Inteligência
              </Button>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-500" />
              Briefings e Pesquisas
            </h1>
            <p className="text-gray-400 mt-2">
              Gerencie briefings de produtos, pesquisas e documentos estratégicos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowBriefingTypeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Briefing
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, nicho ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
            <SelectTrigger className="w-full md:w-[200px] bg-gray-800 border-gray-700">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por nicho" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Todos os nichos</SelectItem>
              {uniqueCategorias.map(categoria => (
                <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p>Carregando briefings...</p>
            </div>
          </div>
        ) : filteredBriefings.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              Nenhum briefing encontrado
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCategoria !== "all" 
                ? "Tente ajustar os filtros de busca" 
                : "Comece criando seu primeiro briefing de produto"
              }
            </p>
            {!searchTerm && selectedCategoria === "all" && (
              <Button
                onClick={() => setShowBriefingTypeModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Briefing
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBriefings.map((briefing) => {
              const nome = 'nome_produto' in briefing ? briefing.nome_produto : briefing.nome_projeto
              const isVSL = briefing.tipo === 'VSL'
              const publicoAlvo = 'publico_alvo' in briefing ? briefing.publico_alvo : ''
              const precoSugerido = 'preco_sugerido' in briefing ? briefing.preco_sugerido : ''
              
              return (
                <Card
                  key={briefing.id}
                  className={`bg-gray-800/30 border-gray-700 hover:border-${isVSL ? 'green' : 'blue'}-500/50 transition-all duration-300 cursor-pointer hover:scale-105 group`}
                  onClick={() => router.push(
                    isVSL 
                      ? `/swipe-file/briefings/editar/${briefing.id}` 
                      : `/swipe-file/briefings/criativo/editar/${briefing.id}`
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2">
                        <Badge 
                          variant="outline" 
                          className={categoriaColors[briefing.categoria] || categoriaColors["Outros"]}
                        >
                          {briefing.categoria}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={isVSL 
                            ? "bg-green-500/20 text-green-400 border-green-500/50"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/50"
                          }
                        >
                          {briefing.tipo}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(
                              isVSL 
                                ? `/swipe-file/briefings/editar/${briefing.id}` 
                                : `/swipe-file/briefings/criativo/editar/${briefing.id}`
                            )
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingBriefing(briefing)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className={`text-lg font-bold text-white group-hover:text-${isVSL ? 'green' : 'blue'}-400 transition-colors`}>
                      {nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                      {briefing.descricao_breve}
                    </p>
                    
                    <div className="space-y-2 text-xs text-gray-500">
                      {publicoAlvo && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span className="truncate">{publicoAlvo}</span>
                        </div>
                      )}
                      {precoSugerido && (
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">💰</span>
                          <span>{precoSugerido}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(briefing.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Briefing Type Selection Modal */}
      <Dialog open={showBriefingTypeModal} onOpenChange={setShowBriefingTypeModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Escolha o Tipo de Briefing</DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecione que tipo de briefing você deseja criar
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-6">
            <Card 
              className="bg-gray-800/30 border-gray-700 hover:border-green-500/50 transition-all duration-300 cursor-pointer hover:scale-105"
              onClick={() => {
                setShowBriefingTypeModal(false)
                router.push('/swipe-file/briefings/novo')
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <FileText className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Briefing de VSL</h3>
                    <p className="text-sm text-gray-400">
                      Briefing completo para Video Sales Letter com análise de mercado, 
                      público-alvo, copy e estratégia de conversão
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-800/30 border-gray-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer hover:scale-105"
              onClick={() => {
                setShowBriefingTypeModal(false)
                router.push('/swipe-file/briefings/criativo/novo')
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <ExternalLink className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Briefing de Criativos</h3>
                    <p className="text-sm text-gray-400">
                      Briefing focado em anúncios escalados, tendências virais, 
                      hooks visuais e estrutura invisível dos criativos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBriefing} onOpenChange={() => setDeletingBriefing(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja remover o briefing "{
                deletingBriefing && 'nome_produto' in deletingBriefing 
                  ? deletingBriefing.nome_produto 
                  : deletingBriefing?.nome_projeto
              }"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}