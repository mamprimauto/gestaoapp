"use client"

import { useState, useEffect } from "react"
import { Plus, Search, ExternalLink, Edit2, Trash2, Library, Filter, CircleCheck, Activity, BarChart3, Settings, Star, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import SwipeFileForm from "@/components/swipe-file-form"
import SwipeFileTrackingModal from "@/components/swipe-file-tracking-modal"
import SwipeNichesModal from "@/components/swipe-niches-modal"
import SwipeFileDetailsModal from "@/components/swipe-file-details-modal"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

interface SwipeFile {
  id: string
  name: string
  niche: string
  ads_count: number
  link: string
  is_active: boolean
  is_tracking?: boolean
  is_scaling?: boolean
  created_at: string
  updated_at: string
  user_id?: string
}

const nicheColors: Record<string, string> = {
  "Disfunção Erétil (ED)": "bg-blue-500/20 text-blue-400 border-blue-500/50",
  "Emagrecimento": "bg-green-500/20 text-green-400 border-green-500/50",
  "Finanças": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  "Beleza": "bg-pink-500/20 text-pink-400 border-pink-500/50",
  "Saúde": "bg-red-500/20 text-red-400 border-red-500/50",
  "Fitness": "bg-orange-500/20 text-orange-400 border-orange-500/50",
  "Relacionamento": "bg-purple-500/20 text-purple-400 border-purple-500/50",
  "Outros": "bg-gray-500/20 text-gray-400 border-gray-500/50",
}

export default function BibliotecasPage() {
  const router = useRouter()
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<SwipeFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedNiche, setSelectedNiche] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingFile, setEditingFile] = useState<SwipeFile | null>(null)
  const [deletingFile, setDeletingFile] = useState<SwipeFile | null>(null)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [selectedFileForTracking, setSelectedFileForTracking] = useState<SwipeFile | null>(null)
  const [showNichesModal, setShowNichesModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<SwipeFile | null>(null)
  const [insiderRequested, setInsiderRequested] = useState<Set<string>>(new Set())
  const [dynamicNicheColors, setDynamicNicheColors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSwipeFiles()
    loadNicheColors()
  }, [])

  useEffect(() => {
    filterFiles()
  }, [searchTerm, selectedNiche, swipeFiles])

  // Função para carregar cores dos nichos do banco
  const loadNicheColors = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("swipe_niches")
        .select("name, color")
        .eq("is_active", true)

      if (error) throw error

      const colorsMap: Record<string, string> = {}
      data?.forEach(niche => {
        colorsMap[niche.name] = getColorClasses(niche.color)
      })
      
      setDynamicNicheColors(colorsMap)
    } catch (error) {
      // Usar cores padrão em caso de erro
      setDynamicNicheColors(nicheColors)
    }
  }

  // Converter cor do banco para classes CSS
  const getColorClasses = (color: string): string => {
    const colorMap: Record<string, string> = {
      'blue': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'green': 'bg-green-500/20 text-green-400 border-green-500/50',
      'yellow': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      'pink': 'bg-pink-500/20 text-pink-400 border-pink-500/50',
      'red': 'bg-red-500/20 text-red-400 border-red-500/50',
      'orange': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      'purple': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      'indigo': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
      'cyan': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
      'emerald': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      'gray': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
    return colorMap[color] || colorMap['gray']
  }

  // Função para verificar se uma biblioteca está escalando
  const checkIfScaling = async (swipeFileId: string): Promise<boolean> => {
    try {
      const supabase = await getSupabaseClient()
      
      // Buscar todos os dias de rastreamento
      const { data, error } = await supabase
        .from("swipe_file_tracking")
        .select("day_number, ads_count")
        .eq("swipe_file_id", swipeFileId)
        .order("day_number", { ascending: true })

      if (error || !data || data.length === 0) return false

      // Pegar o valor do Dia 1
      const day1 = data.find(d => d.day_number === 1)
      if (!day1 || !day1.ads_count) return false

      // Verificar se algum dia posterior supera o Dia 1
      const isScaling = data.some(d => 
        d.day_number > 1 && 
        d.ads_count > day1.ads_count
      )

      return isScaling
    } catch (error) {
      return false
    }
  }

  const loadSwipeFiles = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("swipe_files")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Verificar escalamento para bibliotecas que estão sendo rastreadas
      const filesWithScaling = await Promise.all(
        (data || []).map(async (file) => {
          if (file.is_tracking) {
            const isScaling = await checkIfScaling(file.id)
            return { ...file, is_scaling: isScaling }
          }
          return { ...file, is_scaling: false }
        })
      )

      setSwipeFiles(filesWithScaling)
    } catch (error) {
      toast.error("Erro ao carregar bibliotecas")
    } finally {
      setLoading(false)
    }
  }

  const filterFiles = () => {
    let filtered = [...swipeFiles]

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.niche.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por nicho
    if (selectedNiche !== "all") {
      filtered = filtered.filter(file => file.niche === selectedNiche)
    }

    setFilteredFiles(filtered)
  }

  const handleSave = async (data: Partial<SwipeFile>) => {
    try {
      const supabase = await getSupabaseClient()
      
      if (editingFile) {
        // Atualizar
        const { error } = await supabase
          .from("swipe_files")
          .update({
            name: data.name,
            niche: data.niche,
            ads_count: data.ads_count,
            link: data.link,
            is_active: true,
          })
          .eq("id", editingFile.id)

        if (error) {
          if (error.code === '42P01') {
            toast.error("Tabela swipe_files não existe. Execute o script SQL no Supabase.")
          } else {
            toast.error(`Erro ao atualizar: ${error.message}`)
          }
          throw error
        }
        toast.success("Biblioteca atualizada com sucesso!")
      } else {
        // Criar nova
        const { data: newFile, error } = await supabase
          .from("swipe_files")
          .insert({
            name: data.name,
            niche: data.niche,
            ads_count: data.ads_count,
            link: data.link,
            is_active: true,
          })
          .select()
          .single()

        if (error) {
          if (error.code === '42P01') {
            toast.error("Tabela swipe_files não existe. Execute o script SQL no Supabase.")
          } else if (error.code === '23502') {
            toast.error("Campo obrigatório faltando. Verifique se a tabela foi criada corretamente.")
          } else {
            toast.error(`Erro ao criar: ${error.message}`)
          }
          throw error
        }
        
        // Se foi criada com quantidade de anúncios, criar o Dia 1 automaticamente
        if (newFile && data.ads_count && data.ads_count > 0) {
          // Usar a data de criação da biblioteca como Dia 1, não a data atual
          const creationDate = new Date(newFile.created_at)
          const dateStr = creationDate.toISOString().split('T')[0]

          // Criar registro do Dia 1 usando a data de criação
          const { error: trackingError } = await supabase
            .from("swipe_file_tracking")
            .insert({
              swipe_file_id: newFile.id,
              date: dateStr,
              ads_count: data.ads_count,
              day_number: 1
            })
          
          if (trackingError) {
            // Não vamos falhar a criação da biblioteca por isso
            toast.warning("Biblioteca criada, mas não foi possível criar o registro do Dia 1")
          } else {
            // Marcar a biblioteca como rastreando automaticamente
            await supabase
              .from("swipe_files")
              .update({ is_tracking: true })
              .eq("id", newFile.id)
            
            toast.success("Biblioteca criada com sucesso! Dia 1 registrado automaticamente.")
          }
        } else {
          toast.success("Biblioteca criada com sucesso!")
        }
      }

      await loadSwipeFiles()
      setShowForm(false)
      setEditingFile(null)
    } catch (error: any) {
      // Error já foi tratado acima
    }
  }

  const handleDelete = async () => {
    if (!deletingFile) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from("swipe_files")
        .delete()
        .eq("id", deletingFile.id)

      if (error) throw error

      toast.success("Biblioteca removida com sucesso!")
      await loadSwipeFiles()
    } catch (error) {
      toast.error("Erro ao remover biblioteca")
    } finally {
      setDeletingFile(null)
    }
  }

  const handleStartTracking = async (file: SwipeFile) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Usar a data de criação da biblioteca como Dia 1, não a data atual
      const { data: fileData, error: fileError } = await supabase
        .from("swipe_files")
        .select("created_at")
        .eq("id", file.id)
        .single()
        
      if (fileError || !fileData?.created_at) {
        console.error('Erro ao obter data de criação:', fileError)
        toast.error("Erro ao obter data de criação da biblioteca")
        return
      }
      
      const creationDate = new Date(fileData.created_at)
      const dateStr = creationDate.toISOString().split('T')[0]
      
      // Verificar se já existe um Dia 1
      const { data: existingDay1 } = await supabase
        .from("swipe_file_tracking")
        .select("*")
        .eq("swipe_file_id", file.id)
        .eq("day_number", 1)
        .single()
      
      // Se não existe Dia 1, criar com o valor inicial
      if (!existingDay1) {
        const { error: trackingError } = await supabase
          .from("swipe_file_tracking")
          .insert({
            swipe_file_id: file.id,
            date: dateStr,
            ads_count: file.ads_count, // Usar o valor inicial da biblioteca
            day_number: 1
          })
        
        if (trackingError) {
          console.error('Erro ao criar tracking do Dia 1:', trackingError)
        }
      }
      
      // Marcar como rastreando
      const { error } = await supabase
        .from("swipe_files")
        .update({ is_tracking: true })
        .eq("id", file.id)

      if (error) throw error

      await loadSwipeFiles()
      toast.success("Rastreamento iniciado! Dia 1 registrado com " + file.ads_count + " anúncios.")
    } catch (error) {
      toast.error("Erro ao iniciar rastreamento")
    }
  }

  const handleOpenTracking = (file: SwipeFile) => {
    setSelectedFileForTracking(file)
    setShowTrackingModal(true)
  }

  const handleTrackingSaved = () => {
    loadSwipeFiles() // Recarrega incluindo verificação de escalamento
  }

  const handleOpenDetails = (file: SwipeFile) => {
    setSelectedFileForDetails(file)
    setShowDetailsModal(true)
  }

  const handleToggleInsider = (fileId: string, fromList: boolean = false) => {
    setInsiderRequested(prev => {
      const newSet = new Set(prev)
      
      // Se for da lista, apenas adiciona (não remove)
      if (fromList) {
        if (!newSet.has(fileId)) {
          newSet.add(fileId)
          toast.success("Insider solicitado com sucesso!")
        }
        // Se já tem insider e clicou na lista, não faz nada
        return newSet
      }
      
      // Se for do modal de detalhes, permite toggle completo
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
        toast.success("Solicitação de Insider removida")
      } else {
        newSet.add(fileId)
        toast.success("Insider solicitado com sucesso!")
      }
      return newSet
    })
  }

  const uniqueNiches = Array.from(new Set(swipeFiles.map(f => f.niche)))

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
              <Library className="h-8 w-8 text-blue-500" />
              Bibliotecas do Facebook
            </h1>
            <p className="text-gray-400 mt-2">
              Visualização compacta de todas as bibliotecas de anúncios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowNichesModal(true)}
              variant="outline"
              size="icon"
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
              title="Gerenciar Nichos"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setEditingFile(null)
                setShowForm(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Biblioteca
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou nicho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Select value={selectedNiche} onValueChange={setSelectedNiche}>
            <SelectTrigger className="w-full md:w-[200px] bg-gray-800 border-gray-700">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por nicho" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Todos os nichos</SelectItem>
              {uniqueNiches.map(niche => (
                <SelectItem key={niche} value={niche}>{niche}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden">
          {/* Status */}
          <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-400">Online</span>
            </div>
            <span className="text-sm text-gray-400">
              Super Planilha de Bibliotecas
            </span>
          </div>

          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nome da Biblioteca
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nicho
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Qtd. Anúncios
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Links
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Adicionado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Carregando bibliotecas...
                    </td>
                  </tr>
                ) : filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Nenhuma biblioteca encontrada
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file, index) => {
                    const hasInsider = insiderRequested.has(file.id)
                    return (
                      <tr
                        key={file.id}
                        className={`hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          hasInsider ? 'ring-2 ring-yellow-500/50 bg-yellow-500/5' : ''
                        }`}
                        onClick={() => handleOpenDetails(file)}
                      >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full" />
                          <span className="text-sm font-medium text-white">
                            {filteredFiles.length - index}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {file.name}
                          </span>
                          {file.is_scaling && (
                            <span className="text-lg" title="Escalando">🔥</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant="outline" 
                          className={dynamicNicheColors[file.niche] || nicheColors[file.niche] || nicheColors["Outros"]}
                        >
                          <CircleCheck className="h-3 w-3 mr-1" />
                          {file.niche}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">👥</span>
                          <span className="text-sm font-medium text-white">
                            {file.ads_count.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={file.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          📅 {new Date(file.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleInsider(file.id, true) // true indica que é da lista
                            }}
                            disabled={hasInsider} // Desabilita se já tem insider
                            className={`${
                              hasInsider
                                ? 'text-yellow-400 cursor-default'
                                : 'text-gray-400 hover:text-yellow-400'
                            }`}
                          >
                            <Star
                              className={`h-4 w-4 mr-1 ${
                                hasInsider ? 'fill-yellow-400' : ''
                              }`}
                            />
                            {hasInsider ? 'Insider' : 'Solicitar'}
                          </Button>
                          {!file.is_tracking ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartTracking(file)
                              }}
                              className="text-gray-400 hover:text-green-400"
                            >
                              <Activity className="h-4 w-4 mr-1" />
                              Rastrear
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenTracking(file)
                              }}
                              className="text-gray-400 hover:text-blue-400"
                            >
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Resultados
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingFile(file)
                              setShowForm(true)
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-white"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingFile(file)
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <SwipeFileForm
          file={editingFile}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditingFile(null)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFile} onOpenChange={() => setDeletingFile(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja remover a biblioteca "{deletingFile?.name}"?
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

      {/* Tracking Modal */}
      <SwipeFileTrackingModal
        file={selectedFileForTracking}
        open={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false)
          setSelectedFileForTracking(null)
        }}
        onSave={handleTrackingSaved}
      />

      {/* Niches Modal */}
      <SwipeNichesModal
        open={showNichesModal}
        onClose={() => setShowNichesModal(false)}
        onUpdate={() => {
          loadSwipeFiles()
          loadNicheColors()
        }}
      />

      {/* Details Modal */}
      <SwipeFileDetailsModal
        file={selectedFileForDetails}
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedFileForDetails(null)
        }}
        hasInsider={selectedFileForDetails ? insiderRequested.has(selectedFileForDetails.id) : false}
        onToggleInsider={handleToggleInsider}
      />
    </div>
  )
}