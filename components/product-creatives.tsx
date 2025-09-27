"use client"

import type React from "react"

import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useUploadQueue } from "./upload-queue-context"
import { useTaskData } from "./task-data"
import { useFileCache } from "@/hooks/use-file-cache"
import { getProductById, WorkflowType } from "@/lib/products-db"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// Dropdown menu functionality will be added later
import CreativeDetailsModal from "./creative-details-modal"
import ProductMaterialsGallery from "./product-materials-gallery"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  User,
  Users, 
  Trash2,
  Image as ImageIcon,
  FileText,
  Clock,
  Upload,
  Loader2,
  X,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Check,
  Copy,
  CheckCircle,
  Home,
  Edit3,
  Folder,
  RotateCcw,
  Palette,
  UserPlus,
  Video
} from "lucide-react"
import InlineFileUpload, { InlineFileUploadButton } from "./inline-file-upload"
import FileDownloadSelector from "./file-download-selector"
import { SimpleFileUpload } from "./simple-file-upload"
import { InlineTimer } from "./inline-timer"
import CreativeTimeDisplay from "./creative-time-display"
import { CreativeFilters, type CreativeFilters as CreativeFiltersType } from "./creative-filters"

type Priority = "low" | "med" | "high" | null

function priorityRank(p: Priority) {
  return p === "high" ? 0 : p === "med" ? 1 : 2
}

interface ProductCreativesProps {
  productId: string
  workflowType?: WorkflowType
  onBack: () => void
  onCreateTask: () => void
  autoOpenTaskId?: string | null
  onAutoOpenComplete?: () => void
  onWorkflowTypeChange?: (workflowType: WorkflowType) => void
}

export default function ProductCreatives({ productId, workflowType = "criativos", onBack, onCreateTask, autoOpenTaskId, onAutoOpenComplete, onWorkflowTypeChange }: ProductCreativesProps) {
  const { tasks, loading, deleteTask, members, userId, updateTask, createVariation, duplicateTask } = useTaskData()
  const { preloadFiles } = useFileCache()
  const { toast } = useToast()

  // Configuração dinâmica por tipo de workflow
  const workflowConfig = {
    criativos: {
      singular: "Criativo",
      plural: "Criativos",
      article: "o criativo",
      createText: "Criar Criativo"
    },
    leads: {
      singular: "Lead",
      plural: "Leads",
      article: "o lead",
      createText: "Criar Lead"
    },
    vsl: {
      singular: "VSL",
      plural: "VSLs",
      article: "o VSL",
      createText: "Criar VSL"
    },
    materiais: {
      singular: "Material",
      plural: "Materiais",
      article: "o material",
      createText: "Upload Material"
    }
  }
  const config = workflowConfig[workflowType]
  const [openId, setOpenId] = useState<string | null>(null)
  const [filters, setFilters] = useState<CreativeFiltersType>({
    status: "all",
    copy: "all",
    editor: "all"
  })
  const [expandedCreatives, setExpandedCreatives] = useState<Set<string>>(new Set())
  const [isCompletedSectionExpanded, setIsCompletedSectionExpanded] = useState(true)
  const [pendingItemsToShow, setPendingItemsToShow] = useState(10)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [creativeToDelete, setCreativeToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isFileDeleteInProgress, setIsFileDeleteInProgress] = useState(false)
  const [showResetTimerDialog, setShowResetTimerDialog] = useState(false)
  const [taskToResetTimer, setTaskToResetTimer] = useState<{ id: string; title: string } | null>(null)

  const product = getProductById(productId)

  // Auto-abrir modal após criar novo item
  useEffect(() => {
    if (autoOpenTaskId && onAutoOpenComplete) {
      setOpenId(autoOpenTaskId)
      onAutoOpenComplete()
    }
  }, [autoOpenTaskId, onAutoOpenComplete])

  // Listen for file delete events to prevent creative modal from opening
  useEffect(() => {
    const handleFileDeleteStart = () => {
      setIsFileDeleteInProgress(true)
    }
    
    const handleFileDeleteEnd = () => {
      // Add a small delay to ensure all events have been processed
      setTimeout(() => {
        setIsFileDeleteInProgress(false)
      }, 100)
    }
    
    window.addEventListener('file-delete-start', handleFileDeleteStart)
    window.addEventListener('file-delete-end', handleFileDeleteEnd)
    
    return () => {
      window.removeEventListener('file-delete-start', handleFileDeleteStart)
      window.removeEventListener('file-delete-end', handleFileDeleteEnd)
    }
  }, [])

  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string | null; avatar_url: string | null; email: string | null }>()
    for (const m of members) {
      map.set(m.id, { name: m.name, avatar_url: m.avatar_url, email: m.email })
    }
    // Membros com avatar já foram verificados
    return map
  }, [members])

  // Helper function to extract creative info from task description with auto-detection
  const getTaskCreativeInfo = useCallback((task: any) => {
    try {
      const parsed = JSON.parse(task.description || '{}')
      
      // Auto-detect initials if empty
      let copyInitials = parsed.iniciais_copy || ''
      let editorInitials = parsed.iniciais_editor || ''
      
      // If initials are empty, try to auto-detect from members
      if (!copyInitials) {
        // First try to find members with copy-related keywords
        let copyMember = members.find(m => 
          m.email?.toLowerCase().includes('copy') || 
          m.name?.toLowerCase().includes('copy')
        )
        
        // If no copy member found, use the first available member as fallback
        if (!copyMember && members.length > 0) {
          copyMember = members[0]
        }
        
        if (copyMember) {
          copyInitials = getUserInitials(copyMember.name, copyMember.email)
        }
      }
      
      if (!editorInitials) {
        // First try to find members with editor-related keywords
        let editorMember = members.find(m => 
          m.email?.toLowerCase().includes('edit') || 
          m.name?.toLowerCase().includes('edit') ||
          m.email?.toLowerCase().includes('edicao') || 
          m.name?.toLowerCase().includes('edicao')
        )
        
        // If no editor member found, use the second available member or first if only one exists
        if (!editorMember && members.length > 0) {
          editorMember = members.length > 1 ? members[1] : members[0]
        }
        
        if (editorMember) {
          editorInitials = getUserInitials(editorMember.name, editorMember.email)
        }
      }
      
      return {
        copyInitials,
        editorInitials,
        statusDesempenho: parsed.status_desempenho || 'NAO VALIDADO',
        isReady: parsed.is_ready || false
      }
    } catch {
      return { copyInitials: '', editorInitials: '', statusDesempenho: 'NAO VALIDADO', isReady: false }
    }
  }, [members])

  // Helper function to get user initials
  const getUserInitials = useCallback((name: string | null, email: string | null): string => {
    if (name && name.trim()) {
      return name.trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return "XX"
  }, [])

  // Helper function to check if a group (main creative + all variations) is completely ready
  const isGroupCompletelyReady = (mainTask: any, variations: any[]) => {
    const mainReady = getTaskCreativeInfo(mainTask).isReady
    const allVariationsReady = variations.length === 0 || variations.every(variation => {
      return getTaskCreativeInfo(variation).isReady
    })
    return mainReady && allVariationsReady
  }

  const { pendingCreatives, completedCreatives, totalCreatives, paginatedPendingCreatives, hasMorePending } = useMemo(() => {
    // Filter by product and creative tag
    let filtered = tasks.filter((t) => {
      const hasCorrectTag = t.tag === workflowType
      const hasCorrectOwner = t.owner === productId
      const matchesProduct = hasCorrectTag && hasCorrectOwner
      
      return matchesProduct
    })
    
    // Apply new filters to all tasks (main and variations)
    if (filters.status !== "all") {
      filtered = filtered.filter((t) => {
        const { statusDesempenho } = getTaskCreativeInfo(t)
        return statusDesempenho === filters.status
      })
    }
    
    if (filters.copy !== "all") {
      filtered = filtered.filter((t) => {
        const { copyInitials } = getTaskCreativeInfo(t)
        return copyInitials === filters.copy
      })
    }
    
    if (filters.editor !== "all") {
      filtered = filtered.filter((t) => {
        const { editorInitials } = getTaskCreativeInfo(t)
        return editorInitials === filters.editor
      })
    }

    // Separate main creatives and variations
    const mainCreatives = filtered.filter(t => !t.parent_id)
    const variations = filtered.filter(t => t.parent_id)

    // Helper function to create hierarchical structure
    const createHierarchical = (mains: any[]) => {
      return mains.map(main => {
        const taskVariations = variations
          .filter(v => v.parent_id === main.id)
          .sort((a, b) => {
            // Sort variations by type, then by number
            if (a.variation_type !== b.variation_type) {
              const order = { 'hook': 0, 'body': 1, 'clickbait': 2, 'trilha': 3, 'avatar': 4, 'filtro': 5 }
              return (order[a.variation_type as keyof typeof order] || 0) - (order[b.variation_type as keyof typeof order] || 0)
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })

        return {
          main,
          variations: taskVariations,
          hasVariations: taskVariations.length > 0
        }
      }).sort((a, b) => {
        const byPriority = priorityRank(a.main.priority) - priorityRank(b.main.priority)
        if (byPriority !== 0) return byPriority
        // Ordenar por updated_at para que criativos recém-modificados apareçam no topo
        return new Date(b.main.updated_at).getTime() - new Date(a.main.updated_at).getTime()
      })
    }

    // Separate main creatives by ready status - considering variations
    const pendingMains = mainCreatives.filter(task => {
      const taskVariations = variations.filter(v => v.parent_id === task.id)
      return !isGroupCompletelyReady(task, taskVariations)
    })

    const completedMains = mainCreatives.filter(task => {
      const taskVariations = variations.filter(v => v.parent_id === task.id)
      return isGroupCompletelyReady(task, taskVariations)
    })

    const pendingHierarchical = createHierarchical(pendingMains)
    const completedHierarchical = createHierarchical(completedMains)

    // Calculate total creatives (main + variations)
    const totalCount = pendingHierarchical.reduce((acc, item) => acc + 1 + item.variations.length, 0) +
                     completedHierarchical.reduce((acc, item) => acc + 1 + item.variations.length, 0)

    // Apply pagination to pending creatives
    const paginatedPending = pendingHierarchical.slice(0, pendingItemsToShow)
    const hasMore = pendingItemsToShow < pendingHierarchical.length

    return {
      pendingCreatives: pendingHierarchical,
      completedCreatives: completedHierarchical,
      totalCreatives: totalCount,
      paginatedPendingCreatives: paginatedPending,
      hasMorePending: hasMore
    }
  }, [tasks, productId, workflowType, filters, pendingItemsToShow])

  // Extract available copy and editor lists from all tasks
  const availableCopyList = useMemo(() => {
    const copySet = new Set<string>()
    tasks
      .filter((t) => t.tag === workflowType && t.owner === productId)
      .forEach(task => {
        const { copyInitials } = getTaskCreativeInfo(task)
        if (copyInitials) copySet.add(copyInitials)
      })
    return Array.from(copySet).sort()
  }, [tasks, productId, workflowType])

  const availableEditorList = useMemo(() => {
    const editorSet = new Set<string>()
    tasks
      .filter((t) => t.tag === workflowType && t.owner === productId)
      .forEach(task => {
        const { editorInitials } = getTaskCreativeInfo(task)
        if (editorInitials) editorSet.add(editorInitials)
      })
    return Array.from(editorSet).sort()
  }, [tasks, productId, workflowType])

  const hasFilters = filters.status !== "all" || filters.copy !== "all" || filters.editor !== "all"

  // Preload file data for all visible tasks to optimize performance
  useEffect(() => {
    const allTaskIds = [
      ...pendingCreatives.flatMap(item => [item.main.id, ...item.variations.map(v => v.id)]),
      ...completedCreatives.flatMap(item => [item.main.id, ...item.variations.map(v => v.id)])
    ]
    
    if (allTaskIds.length > 0 && !loading) {
      void preloadFiles(allTaskIds, 'entregavel')
    }
  }, [pendingCreatives, completedCreatives, preloadFiles, loading])

  // Estabilizar referências para evitar re-renders do modal
  const handleModalOpenChange = useCallback((v: boolean) => {
    if (!v) setOpenId(null)
  }, [])

  const handleCreativeClick = useCallback((id: string, event?: React.MouseEvent) => {
    // Don't open creative modal if file delete is in progress
    if (isFileDeleteInProgress) {
      return
    }
    
    // Verificar se o clique veio de um elemento filho que não deve propagar
    if (event?.target && event.target instanceof HTMLElement) {
      // Verificar se o clique foi em um botão ou em um elemento dentro de um dialog/modal
      const clickedElement = event.target as HTMLElement
      const isButton = clickedElement.tagName === 'BUTTON' || clickedElement.closest('button')
      const isDialog = clickedElement.closest('[role="dialog"]')
      const isModal = clickedElement.closest('.fixed.inset-0') // Modais geralmente têm essa classe
      
      if (isButton || isDialog || isModal) {
        return
      }
    }
    
    // Pequeno debounce para evitar cliques duplos
    setTimeout(() => {
      setOpenId(id)
    }, 50)
  }, [isFileDeleteInProgress])

  const handleDeleteCreative = useCallback((id: string, title: string) => {
    setCreativeToDelete({ id, title })
  }, [])

  const confirmDeleteCreative = useCallback(async () => {
    if (!creativeToDelete) return
    
    await deleteTask(creativeToDelete.id)
    if (openId === creativeToDelete.id) setOpenId(null)
    
    toast({
      title: `${config.singular} excluído`,
      description: `${creativeToDelete.title} foi excluído com sucesso.`,
    })
    
    setCreativeToDelete(null)
  }, [creativeToDelete, deleteTask, openId, toast])

  const handleResetTimer = useCallback((id: string, title: string) => {
    setTaskToResetTimer({ id, title })
    setShowResetTimerDialog(true)
  }, [])

  const confirmResetTimer = useCallback(async () => {
    if (!taskToResetTimer) return

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        throw new Error("Usuário não autenticado")
      }

      const res = await fetch(`/api/tasks/${taskToResetTimer.id}/time/reset`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (res.ok) {
        toast({
          title: "Timer resetado",
          description: `Timer do criativo ${taskToResetTimer.title} foi resetado com sucesso.`
        })
      } else {
        throw new Error("Erro ao resetar timer")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível resetar o timer.",
        variant: "destructive"
      })
    } finally {
      setShowResetTimerDialog(false)
      setTaskToResetTimer(null)
    }
  }, [taskToResetTimer, toast])

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Produto não encontrado</p>
      </div>
    )
  }

  return (
    <>
      {/* Header com informações do produto */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-10 w-10 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
            title="Voltar para a lista de produtos"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br",
                product.bgGradient
              )}
            >
              {product.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{product.name}</h1>
              <p className="text-sm text-white/70">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        {workflowType !== "materiais" && (
          <div className="flex items-center gap-3">
            <Button
              className="bg-[#007AFF] text-white hover:bg-[#007AFF]/90 rounded-xl"
              onClick={onCreateTask}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {config.createText}
            </Button>
          </div>
        )}
      </div>

      {/* Filtros Unificados - Escondidos quando workflowType for "materiais" */}
      {workflowType !== "materiais" && (
        <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Seletor de Workflow */}
          {onWorkflowTypeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70 whitespace-nowrap">Material:</span>
              <Select
                value={workflowType}
                onValueChange={(value: WorkflowType) => onWorkflowTypeChange(value)}
              >
                <SelectTrigger className="w-[140px] bg-[#2A2A2C] border-[#3A3A3C] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2C] border-[#3A3A3C]">
                  <SelectItem value="criativos" className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <span>Criativos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="leads" className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Leads</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="vsl" className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span>VSL</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="materiais" className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      <span>Materiais</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sistema de Filtros Integrado */}
          <CreativeFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableCopyList={availableCopyList}
            availableEditorList={availableEditorList}
          />
        </div>
      )}

      {/* Render galeria de materiais se workflowType for materiais */}
      {workflowType === "materiais" ? (
        <ProductMaterialsGallery
          productId={productId}
          onBack={onBack}
        />
      ) : (
        <>
          {/* Seção de Criativos Pendentes */}
      <div className="rounded-2xl border border-blue-500/30 bg-[#1F1F1F] mb-6">
        {/* Header da seção pendentes */}
        <div className="border-b border-[#3A3A3C] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-400" />
              <h3 className="text-white font-medium">{config.plural} Pendentes ({pendingCreatives.length})</h3>
            </div>
            {pendingCreatives.length > 0 && (
              <div className="text-xs text-white/60">
                Mostrando {Math.min(pendingItemsToShow, pendingCreatives.length)} de {pendingCreatives.length}
              </div>
            )}
          </div>
        </div>

        {/* Cabeçalhos das colunas */}
        <div className="hidden lg:grid lg:grid-cols-[80px_minmax(380px,1fr)_140px_160px_120px_140px_96px] lg:gap-x-6 px-6 py-3 text-xs font-medium text-white/60 bg-[#2C2C2E] border-b border-[#3A3A3C]">
          <div className="flex items-center">
            <ImageIcon className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            CRIATIVO
          </div>
          <div className="flex items-center justify-center gap-2">
            STATUS
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            RESPONSÁVEIS
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            TEMPO
          </div>
          <div className="flex items-center justify-center gap-2">
            <Calendar className="h-3 w-3" />
            PRAZO
          </div>
          <div className="flex items-center justify-center text-xs font-medium text-white/60">
            AÇÕES
          </div>
        </div>

        {/* Lista de criativos pendentes */}
        <div className="divide-y divide-[#3A3A3C] bg-blue-500/5">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <div className="h-12 w-12 bg-[#3A3A3C] rounded-lg" />
                    </div>
                    <div className="col-span-4">
                      <div className="h-4 w-3/4 bg-[#3A3A3C] rounded mb-2" />
                      <div className="h-3 w-1/2 bg-[#3A3A3C] rounded" />
                    </div>
                    <div className="col-span-2">
                      <div className="h-6 w-20 bg-[#3A3A3C] rounded-full mx-auto" />
                    </div>
                    <div className="col-span-2">
                      <div className="h-8 w-8 bg-[#3A3A3C] rounded-full" />
                    </div>
                    <div className="col-span-2">
                      <div className="h-3 w-16 bg-[#3A3A3C] rounded" />
                    </div>
                    <div className="col-span-1">
                      <div className="h-3 w-12 bg-[#3A3A3C] rounded mx-auto" />
                    </div>
                    <div className="col-span-1">
                      <div className="h-4 w-4 bg-[#3A3A3C] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          {!loading && pendingCreatives.length === 0 && completedCreatives.length === 0 && (
            <div className="px-6 py-16 text-center text-white/70">
              <div className="text-6xl mb-4">{product.icon}</div>
              <p className="text-lg font-medium mb-2">Nenhum criativo para {product.name}</p>
              <p className="text-sm mb-6">Crie seu primeiro criativo para este produto!</p>
              <Button
                onClick={onCreateTask}
                className="bg-[#007AFF] text-white hover:bg-[#007AFF]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Criativo
              </Button>
            </div>
          )}
          {!loading && pendingCreatives.length === 0 && completedCreatives.length > 0 && (
            <div className="px-6 py-12 text-center text-white/70">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Todos os criativos estão prontos!</p>
              <p className="text-sm mb-6">Crie um novo criativo ou revise os já concluídos.</p>
              <Button
                onClick={onCreateTask}
                className="bg-[#007AFF] text-white hover:bg-[#007AFF]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Criativo
              </Button>
            </div>
          )}
          {!loading &&
            paginatedPendingCreatives.map((item) => (
              <div key={item.main.id} className="transition-all duration-300">
                {/* Main Creative */}
                <CreativeItem
                  task={item.main}
                  memberMap={memberMap}
                  onDelete={() => handleDeleteCreative(item.main.id, item.main.title)}
                  onClick={(e) => handleCreativeClick(item.main.id, e)}
                  isMainCreative={true}
                  hasVariations={item.hasVariations}
                  isExpanded={expandedCreatives.has(item.main.id)}
                  onToggleExpand={() => {
                    const newExpanded = new Set(expandedCreatives)
                    if (newExpanded.has(item.main.id)) {
                      newExpanded.delete(item.main.id)
                    } else {
                      newExpanded.add(item.main.id)
                    }
                    setExpandedCreatives(newExpanded)
                  }}
                  onCreateVariation={(variationType) => {
                    void createVariation(item.main.id, variationType)
                  }}
                  onMarkAsReady={() => {
                    // Expandir seção de prontos quando marcar como pronto
                    setIsCompletedSectionExpanded(true)
                  }}
                  pendingVariationsCount={item.variations.filter(v => !getTaskCreativeInfo(v).isReady).length}
                  onResetTimer={handleResetTimer}
                  config={config}
                />
                
                {/* Variations */}
                {item.hasVariations && expandedCreatives.has(item.main.id) && (
                  <div className="transition-all duration-300">
                    {item.variations.map((variation) => (
                      <div 
                        key={variation.id}
                        className="border-l-2 border-white/10 ml-6 pl-4 bg-[#1A1A1A]"
                      >
                        <CreativeItem
                          task={variation}
                          memberMap={memberMap}
                          onDelete={() => handleDeleteCreative(variation.id, variation.title)}
                          onClick={(e) => handleCreativeClick(variation.id, e)}
                          isVariation={true}
                          variationType={variation.variation_type}
                          onResetTimer={handleResetTimer}
                          config={config}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Show More Button */}
        {hasMorePending && !loading && (
          <div className="border-t border-[#3A3A3C] px-6 py-4 bg-[#1A1A1A]">
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={async () => {
                  setIsLoadingMore(true)
                  // Add a small delay for better UX
                  await new Promise(resolve => setTimeout(resolve, 300))
                  setPendingItemsToShow(prev => prev + 10)
                  setIsLoadingMore(false)
                }}
                disabled={isLoadingMore}
                variant="outline"
                className="border-[#3A3A3C] bg-[#2A2A2C] hover:bg-[#3A3A3C] text-white px-6 py-2 rounded-xl transition-all duration-300"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    Mostrar Mais
                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                      +10
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

        {/* Seção de Criativos Prontos */}
        {completedCreatives.length > 0 && (
          <div className="bg-gray-800/30 border border-green-500/30 rounded-lg overflow-hidden">
          {/* Header da seção prontos com collapse */}
          <div 
            className="border-b border-[#3A3A3C] px-6 py-4 cursor-pointer hover:bg-[#2C2C2E] transition-colors"
            onClick={() => setIsCompletedSectionExpanded(!isCompletedSectionExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <h3 className="text-white font-medium">{config.plural} Prontos ({completedCreatives.length})</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  {completedCreatives.reduce((acc, item) => acc + 1 + item.variations.length, 0)} total
                </span>
                {isCompletedSectionExpanded ? (
                  <ChevronUp className="h-4 w-4 text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/60" />
                )}
              </div>
            </div>
          </div>

          {/* Conteúdo colapsável da seção prontos */}
          {isCompletedSectionExpanded && (
            <div className="transition-all duration-300">
              {/* Cabeçalhos das colunas */}
              <div className="hidden lg:grid lg:grid-cols-[80px_minmax(380px,1fr)_140px_160px_120px_140px_96px] lg:gap-x-6 px-6 py-3 text-xs font-medium text-white/60 bg-[#2C2C2E] border-b border-[#3A3A3C]">
                <div className="flex items-center">
                  <ImageIcon className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  CRIATIVO
                </div>
                <div className="flex items-center justify-center gap-2">
                  STATUS
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  RESPONSÁVEIS
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  TEMPO
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="h-3 w-3" />
                  PRAZO
                </div>
                <div className="flex items-center justify-center text-xs font-medium text-white/60">
                  AÇÕES
                </div>
              </div>

              {/* Lista de criativos prontos */}
              <div className="divide-y divide-[#3A3A3C] bg-green-500/5">
                {completedCreatives.map((item) => (
                  <div key={item.main.id} className="transition-all duration-300">
                    {/* Main Creative */}
                    <CreativeItem
                      task={item.main}
                      memberMap={memberMap}
                      onDelete={() => handleDeleteCreative(item.main.id, item.main.title)}
                      onClick={(e) => handleCreativeClick(item.main.id, e)}
                      isMainCreative={true}
                      hasVariations={item.hasVariations}
                      isExpanded={expandedCreatives.has(item.main.id)}
                      onToggleExpand={() => {
                        const newExpanded = new Set(expandedCreatives)
                        if (newExpanded.has(item.main.id)) {
                          newExpanded.delete(item.main.id)
                        } else {
                          newExpanded.add(item.main.id)
                        }
                        setExpandedCreatives(newExpanded)
                      }}
                      onCreateVariation={(variationType) => {
                        void createVariation(item.main.id, variationType)
                      }}
                      onMarkAsReady={() => {
                        // Não fazer nada aqui pois já está na seção de prontos
                        // Mas poderia colapsar a seção se ficar vazia
                      }}
                      pendingVariationsCount={item.variations.filter(v => !getTaskCreativeInfo(v).isReady).length}
                      onResetTimer={handleResetTimer}
                      config={config}
                    />
                    
                    {/* Variations */}
                    {item.hasVariations && expandedCreatives.has(item.main.id) && (
                      <div className="transition-all duration-300">
                        {item.variations.map((variation) => (
                          <div 
                            key={variation.id}
                            className="border-l-2 border-white/10 ml-6 pl-4 bg-[#1A1A1A]"
                          >
                            <CreativeItem
                              task={variation}
                              memberMap={memberMap}
                              onDelete={() => handleDeleteCreative(variation.id, variation.title)}
                              onClick={(e) => handleCreativeClick(variation.id, e)}
                              isVariation={true}
                              variationType={variation.variation_type}
                              onResetTimer={handleResetTimer}
                              config={config}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Modal de edição */}
      <CreativeDetailsModal
        taskId={openId}
        open={Boolean(openId)}
        onOpenChange={handleModalOpenChange}
        workflowType={workflowType}
        onAfterSave={() => {
          // Resetar filtros após salvar para garantir que o criativo atualizado seja visível
          setFilters({
            status: "all",
            copy: "all",
            editor: "all"
          })
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!creativeToDelete} onOpenChange={(open) => {
        if (!open) {
          setCreativeToDelete(null)
        }
      }}>
        <AlertDialogContent className="bg-[#1F1F1F] border-[#3A3A3C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir o criativo{" "}
              <span className="font-semibold text-white">{creativeToDelete?.title}</span>?
              <br />
              <span className="text-red-400 text-sm">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2E] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCreative}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Criativo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para reset do timer */}
      <AlertDialog open={showResetTimerDialog} onOpenChange={(open) => {
        if (!open) {
          setShowResetTimerDialog(false)
          setTaskToResetTimer(null)
        }
      }}>
        <AlertDialogContent className="bg-[#1F1F1F] border-[#3A3A3C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Resetar Timer</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja resetar o timer do criativo{" "}
              <span className="font-semibold text-white">{taskToResetTimer?.title}</span>?
              <br />
              <span className="text-red-400 text-sm">Todos os tempos registrados serão removidos e esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2E] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetTimer}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Resetar Timer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  )
}

function CreativeItem({
  task,
  memberMap,
  onDelete,
  onClick,
  isMainCreative = false,
  hasVariations = false,
  isExpanded = false,
  onToggleExpand,
  onCreateVariation,
  isVariation = false,
  variationType,
  onMarkAsReady,
  pendingVariationsCount = 0,
  onResetTimer,
  config
}: {
  task: any
  memberMap: Map<string, any>
  onDelete: () => void
  onClick: (e: React.MouseEvent) => void
  isMainCreative?: boolean
  hasVariations?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  onCreateVariation?: (variationType: 'hook' | 'body' | 'clickbait' | 'trilha' | 'avatar' | 'filtro') => void
  isVariation?: boolean
  variationType?: string | null
  onMarkAsReady?: () => void
  pendingVariationsCount?: number
  onResetTimer?: (id: string, title: string) => void
  config: { singular: string; plural: string; article: string; createText: string }
}) {
  const { duplicateTask, createReedition, createVariationFromVariation, updateTask, members, userId } = useTaskData()
  const { toast } = useToast()
  const [showGearMenu, setShowGearMenu] = useState(false)
  const [editingField, setEditingField] = useState<'copy' | 'editor' | 'date' | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ align: 'left' | 'right', vertical: 'top' | 'bottom' }>({ align: 'right', vertical: 'bottom' })
  const assignee = task.assignee_id ? memberMap.get(task.assignee_id) : null
  const creator = task.user_id ? memberMap.get(task.user_id) : null

  // Helper function to get display name for variation type
  const getVariationDisplayName = (variationType: string) => {
    switch (variationType) {
      case 'edicao':
        return 'REEDIÇÃO'
      case 'hook':
        return 'HOOK'
      case 'body':
        return 'BODY'
      case 'clickbait':
        return 'CLICKBAIT'
      case 'trilha':
        return 'TRILHA SONORA'
      case 'avatar':
        return 'AVATAR'
      case 'filtro':
        return 'FILTRO'
      default:
        return variationType.toUpperCase()
    }
  }

  // Helper function to get first name in uppercase
  const getFirstNameUppercase = (name: string | null | undefined): string => {
    if (!name || !name.trim()) return ''
    // Pega a primeira palavra e coloca em maiúsculas
    const firstName = name.trim().split(' ')[0]
    return firstName.toUpperCase()
  }

  // Extrair informações do Copy e Editor do JSON
  const getCreativeInfo = () => {
    try {
      const parsed = JSON.parse(task.description || '{}')
      return {
        copyInitials: parsed.iniciais_copy || '',
        editorInitials: parsed.iniciais_editor || '',
        statusDesempenho: parsed.status_desempenho || 'NAO USADO',
        isReady: parsed.is_ready || false
      }
    } catch {
      return { copyInitials: '', editorInitials: '', statusDesempenho: 'NAO USADO', isReady: false }
    }
  }

  // Function to handle variation creation
  const handleCreateVariation = async (variationType: 'hook' | 'body' | 'clickbait' | 'trilha' | 'avatar' | 'filtro') => {
    if (isMainCreative) {
      onCreateVariation?.(variationType)
    } else {
      await createVariationFromVariation(task.id, variationType)
    }
  }

  const { copyInitials, editorInitials, statusDesempenho, isReady } = getCreativeInfo()
  
  // Encontrar o membro do Copy pelas iniciais
  const copyMember = copyInitials ? 
    Array.from(memberMap.values()).find(member => {
      const initials = member.name ? 
        member.name.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') :
        member.email ? member.email.charAt(0).toUpperCase() : ''
      return initials === copyInitials
    }) : null
  
  // Debug: verificar se o copyMember tem avatar
  if (copyMember && !copyMember.avatar_url) {

  }
  if (assignee && !assignee.avatar_url) {

  }

  // Calculate optimal dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Check horizontal positioning (dropdown needs ~150px width)
    const spaceOnRight = viewportWidth - buttonRect.right
    const spaceOnLeft = buttonRect.left
    const align = spaceOnRight < 150 && spaceOnLeft > 150 ? 'left' : 'right'
    
    // Check vertical positioning (dropdown needs ~200px height)
    const spaceBelow = viewportHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top
    const vertical = spaceBelow < 200 && spaceAbove > 200 ? 'top' : 'bottom'
    
    setDropdownPosition({ align, vertical })
  }, [])

  // Fechar menu ao clicar fora e calcular posição
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setShowGearMenu(false)
    }

    if (showGearMenu) {
      calculateDropdownPosition()
      document.addEventListener('click', handleClickOutside)
      window.addEventListener('resize', calculateDropdownPosition)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        window.removeEventListener('resize', calculateDropdownPosition)
      }
    }
  }, [showGearMenu, calculateDropdownPosition])

  // Suporte a tecla Escape para cancelar edição
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editingField) {
        setEditingField(null)
      }
    }

    if (editingField) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingField])

  // Verificar se usuário pode editar (criador, assignee, ou mesma organização)
  const canEdit = userId && (
    task.user_id === userId || 
    task.assignee_id === userId ||
    (task.organization_id && members.some(m => m.id === userId)) // Membro da organização
  )

  // Função específica para atualizar status de desempenho
  const updateCreativeStatus = async (value: string) => {
    try {
      // Atualizar status no JSON description
      const currentDescription = task.description || '{}'
      let parsedData: any = {}
      
      try {
        parsedData = JSON.parse(currentDescription)
      } catch {
        parsedData = {}
      }

      parsedData.status_desempenho = value

      const updateData = {
        description: JSON.stringify(parsedData),
        owner: task.owner,
        tag: task.tag
      }

      const updated = await updateTask(task.id, updateData)
      
      if (updated) {
        toast({ 
          title: "Status atualizado",
          description: "Status de desempenho atualizado com sucesso."
        })
      } else {
        throw new Error("Falha ao atualizar")
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Falha inesperada",
        variant: "destructive"
      })
    }
  }

  // Função para atualizar campos do criativo
  const updateCreativeField = async (field: string, value: string) => {
    try {
      let updateData: any = {}

      if (field === 'date') {
        // Atualizar due_date diretamente
        updateData = { due_date: value }
      } else {
        // Atualizar campos no JSON description
        const currentDescription = task.description || '{}'
        let parsedData: any = {}
        
        try {
          parsedData = JSON.parse(currentDescription)
        } catch {
          parsedData = {}
        }

        if (field === 'copy') {
          parsedData.iniciais_copy = value
        } else if (field === 'editor') {
          parsedData.iniciais_editor = value
          // Encontrar o membro correspondente e atualizar assignee_id
          const member = members.find(m => {
            const initials = m.name?.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 
                           m.email?.substring(0, 2).toUpperCase() || 'XX'
            return initials === value
          })
          if (member) {
            updateData.assignee_id = member.id
          }
        }

        updateData.description = JSON.stringify(parsedData)
      }

      // Preservar owner e tag para não perder a associação
      updateData.owner = task.owner
      updateData.tag = task.tag

      const updated = await updateTask(task.id, updateData)
      
      if (updated) {
        toast({ 
          title: "Campo atualizado",
          description: `${field === 'date' ? 'Prazo' : field === 'copy' ? 'Copy' : 'Editor'} atualizado com sucesso.`
        })
        setEditingField(null)
      } else {
        throw new Error("Falha ao atualizar")
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Falha inesperada",
        variant: "destructive"
      })
      setEditingField(null)
    }
  }

  const handleFieldClick = (field: 'copy' | 'editor' | 'date', e: React.MouseEvent) => {
    if (!canEdit) return
    e.stopPropagation()
    setEditingField(field)
  }

  const cancelEdit = () => {
    setEditingField(null)
  }

  const toggleReady = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const currentData = JSON.parse(task.description || '{}')
      const newIsReady = !isReady
      const updatedData = {
        ...currentData,
        is_ready: newIsReady
      }
      
      // Atualizar a task no banco com updated_at para reordenação
      const updatedTask = await updateTask(task.id, {
        description: JSON.stringify(updatedData),
        updated_at: new Date().toISOString()
      })
      
      // Forçar re-render se a task foi atualizada com sucesso
      if (updatedTask) {
        // Se está marcando como pronto, expandir a seção de prontos
        if (newIsReady && onMarkAsReady) {
          onMarkAsReady()
        }
        
        // O TaskDataProvider já vai atualizar o estado global
        // Mas vamos garantir que a mensagem seja exibida após a atualização
        setTimeout(() => {
          toast({
            title: newIsReady ? `${config.singular} pronto!` : `${config.singular} desmarcado`,
            description: newIsReady ? `${config.singular} movido para a seção de prontos.` : `${config.singular} movido para a seção de pendentes.`
          })
        }, 100)
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Falha inesperada",
        variant: "destructive"
      })
    }
  }

  const handleCopyTitle = (title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(title)
    toast({
      title: "Copiado!",
      description: `Título ${config.article} copiado para a área de transferência.`
    })
  }

  return (
    <div
      className={cn(
        "px-6 py-4 min-h-[56px] hover:bg-[#2C2C2E] transition-colors cursor-pointer group relative",
        isReady && "border-l-4 border-green-500 bg-green-500/5"
      )}
      onClick={onClick}
    >
      <div className="flex flex-col lg:grid lg:grid-cols-[80px_minmax(380px,1fr)_140px_160px_120px_140px_96px] lg:gap-x-6">
        {/* Check + File preview/upload - Coluna 1: 80px */}
        <div className="hidden lg:flex lg:items-center lg:justify-center lg:gap-2">
          <button
            onClick={toggleReady}
            className={cn(
              "p-2 rounded transition-colors hover:bg-white/10",
              isReady ? "text-green-500" : "text-white/40"
            )}
            title={isReady ? "Marcar como não pronto" : "Marcar como pronto"}
          >
            <Check className="h-5 w-5" />
          </button>
          <SimpleFileUpload taskId={task.id} />
        </div>

        {/* Expand/Collapse and Title - Coluna 2: minmax(420px,1fr) */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex items-start gap-3 lg:hidden">
                <button
                  onClick={toggleReady}
                  className={cn(
                    "p-1 rounded transition-colors hover:bg-white/10",
                    isReady ? "text-green-500" : "text-white/40"
                  )}
                  title={isReady ? "Marcar como não pronto" : "Marcar como pronto"}
                >
                  <Check className="h-3 w-3" />
                </button>
                <SimpleFileUpload taskId={task.id} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Expand/Collapse Arrow only shows when there are variations to expand */}
                    {isMainCreative && hasVariations && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleExpand?.()
                        }}
                        className="p-1 hover:bg-[#3A3A3C] rounded transition-colors flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white/60" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/60" />
                        )}
                      </button>
                    )}
                    
                    {/* Pending count next to expand arrow - mobile */}
                    {isMainCreative && pendingVariationsCount > 0 && (
                      <span className="text-[10px] font-medium text-red-500">
                        ({pendingVariationsCount})
                      </span>
                    )}
                    
                    {/* Variation Type Badge */}
                    {isVariation && variationType && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs px-2 py-0 border text-white/80 flex-shrink-0",
                          variationType === 'hook' && "border-blue-500/50 bg-blue-500/10",
                          variationType === 'body' && "border-green-500/50 bg-green-500/10",
                          variationType === 'clickbait' && "border-yellow-500/50 bg-yellow-500/10",
                          variationType === 'trilha' && "border-orange-500/50 bg-orange-500/10",
                          variationType === 'edicao' && "border-purple-500/50 bg-purple-500/10"
                        )}
                      >
                        {getVariationDisplayName(variationType)}
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="text-sm font-medium text-[#F2F2F7] px-2 py-1 bg-[#3A3A3C] rounded-md cursor-help truncate" 
                        title={task.title}
                      >
                        {task.title}
                      </div>
                      <button
                        onClick={(e) => handleCopyTitle(task.title, e)}
                        className="p-1 hover:bg-[#3A3A3C] rounded transition-colors flex-shrink-0"
                        title="Copiar título"
                      >
                        <Copy className="h-3 w-3 text-white/60" />
                      </button>
                    </div>
                    
                    {/* Timer inline */}
                    <InlineTimer taskId={task.id} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-white/40">Copy:</span>
                        {copyMember ? (
                          <span className="truncate">{copyMember.name || copyInitials}</span>
                        ) : (
                          <span className="text-white/40">{copyInitials || "N/A"}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-white/40">Editor:</span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={assignee?.avatar_url || "/minimal-avatar.png"} />
                          <AvatarFallback className="bg-[#3A3A3C] text-[10px]">
                            {editorInitials || (assignee?.name?.[0] || assignee?.email?.[0] || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{assignee?.name || "Não atribuído"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-white/60">Prazo:</span>
                      <span>
                        {task.due_date ? 
                          new Date(task.due_date + 'T00:00:00').toLocaleDateString("pt-BR") : 
                          "Sem prazo"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <div className="flex items-center gap-3 mb-2">
              {/* Expand/Collapse Arrow only shows when there are variations to expand */}
              {isMainCreative && hasVariations && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleExpand?.()
                  }}
                  className="p-1 hover:bg-[#3A3A3C] rounded transition-colors flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white/60" />
                  )}
                </button>
              )}
              
              {/* Pending count next to expand arrow */}
              {isMainCreative && pendingVariationsCount > 0 && (
                <span className="text-[11px] font-medium text-red-500">
                  ({pendingVariationsCount})
                </span>
              )}
              
              {/* Variation Type Badge */}
              {isVariation && variationType && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs px-2 py-0 border text-white/80 flex-shrink-0",
                    variationType === 'hook' && "border-blue-500/50 bg-blue-500/10",
                    variationType === 'body' && "border-green-500/50 bg-green-500/10",
                    variationType === 'clickbait' && "border-yellow-500/50 bg-yellow-500/10",
                    variationType === 'edicao' && "border-purple-500/50 bg-purple-500/10"
                  )}
                >
                  {getVariationDisplayName(variationType)}
                </Badge>
              )}
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className="text-sm font-medium text-[#F2F2F7] px-2 py-1 bg-[#3A3A3C] rounded-md cursor-help truncate" 
                  title={task.title}
                >
                  {task.title}
                </div>
                <button
                  onClick={(e) => handleCopyTitle(task.title, e)}
                  className="p-1 hover:bg-[#3A3A3C] rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  title="Copiar título"
                >
                  <Copy className="h-3 w-3 text-white/60" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status de Desempenho - Coluna 3: 140px */}
        <div className="hidden lg:flex lg:items-center lg:justify-center">
          {canEdit ? (
            <DirectStatusSelect
              status={statusDesempenho}
              onUpdate={updateCreativeStatus}
            />
          ) : (
            <StatusBadge status={statusDesempenho} />
          )}
        </div>

        {/* Responsáveis - Coluna 4: 160px */}
        <div className="hidden lg:flex lg:items-center lg:gap-2">
          {/* Copy Avatar */}
          <Avatar className="h-8 w-8 border-2 border-[#2A2A2C]">
            <AvatarImage 
              src={copyMember?.avatar_url || "/minimal-avatar.png"} 
              onError={(e) => {

              }}
            />
            <AvatarFallback className={cn(
              "text-xs",
              copyMember ? "bg-[#3A3A3C] text-white/80" : "bg-[#2A2A2C] text-white/40"
            )}>
              {copyInitials || "?"}
            </AvatarFallback>
          </Avatar>
          
          {/* Editor Avatar */}
          <Avatar className="h-8 w-8 border-2 border-[#2A2A2C]">
            <AvatarImage 
              src={assignee?.avatar_url || "/minimal-avatar.png"}
              onError={(e) => {

              }}
            />
            <AvatarFallback className={cn(
              "text-xs",
              assignee ? "bg-[#3A3A3C] text-white/80" : "bg-[#2A2A2C] text-white/40"
            )}>
              {editorInitials || (assignee?.name?.[0] || assignee?.email?.[0] || "?").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Tempo Gasto - Coluna 5: 120px */}
        <div className="hidden lg:flex lg:items-center lg:justify-center">
          {/* Timer inline */}
          <InlineTimer taskId={task.id} />
        </div>

        {/* Prazo - Coluna 6: 140px */}
        <div className="hidden lg:flex lg:items-center lg:justify-center">
          <div className="text-sm text-white/70 text-center">
            {task.due_date ? (
              <div className="font-medium">
                {new Date(task.due_date + 'T00:00:00').toLocaleDateString("pt-BR", { 
                  day: "2-digit", 
                  month: "2-digit",
                  year: "numeric"
                })}
              </div>
            ) : (
              <div className="text-white/50 italic text-xs">
                Sem prazo
              </div>
            )}
          </div>
        </div>

        {/* Ações - Coluna 7: 96px */}
        <div className="hidden lg:flex lg:items-center lg:justify-center">
          {/* Gear Menu for All Creatives */}
          <div className="relative">
            <button
              ref={buttonRef}
              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white/80 transition-all p-2 rounded hover:bg-white/10"
              title="Mais ações"
              onClick={(e) => {
                e.stopPropagation()
                setShowGearMenu(!showGearMenu)
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {/* Gear Menu Dropdown - Rendered via Portal */}
            {showGearMenu && typeof window !== 'undefined' && createPortal(
              <div 
                className="fixed bg-[#2C2C2E] border border-[#3A3A3C] rounded-md shadow-xl z-[9999] min-w-[150px]"
                style={(() => {
                  if (!buttonRef.current) return { top: 0, left: 0, visibility: 'hidden' }
                  const rect = buttonRef.current.getBoundingClientRect()
                  return {
                    top: rect.bottom + 4,
                    left: rect.left - 140,
                    visibility: 'visible'
                  }
                })()}
                onClick={(e) => e.stopPropagation()}
              >
                  {/* Variation Creation Options (only for main creatives) */}
                  {/* Opções de variação - disponível tanto para criativo principal quanto para variações */}
                  {(isMainCreative || isVariation) && (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleCreateVariation('hook')
                          setShowGearMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C] rounded-t-md"
                      >
                        Criar Hook
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleCreateVariation('body')
                          setShowGearMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C]"
                      >
                        Criar Body
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleCreateVariation('clickbait')
                          setShowGearMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C]"
                      >
                        Criar Clickbait
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleCreateVariation('trilha')
                          setShowGearMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C]"
                      >
                        Criar Trilha Sonora
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleCreateVariation('avatar')
                          setShowGearMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C]"
                      >
                        Criar Avatar
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleCreateVariation('filtro')
                          setShowGearMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C]"
                      >
                        Criar Filtro
                      </button>
                      <div className="border-t border-[#3A3A3C] my-1"></div>
                    </>
                  )}
                  
                  {/* Reedition Option */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        await createReedition(task.id)
                      } catch (error) {
                        // Error is handled by createReedition
                      }
                      setShowGearMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C]"
                  >
                    Criar Reedição
                  </button>
                  
                  {/* Reset Timer Option - só aparece se há tempo registrado */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onResetTimer?.(task.id, task.title)
                      setShowGearMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Resetar Timer
                  </button>
                  
                  {/* Duplicate Option */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      void duplicateTask(task.id)
                      setShowGearMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#3A3A3C]"
                  >
                    Duplicar
                  </button>
                  
                  <div className="border-t border-[#3A3A3C] my-1"></div>
                  
                  {/* Delete Option */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                      setShowGearMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#3A3A3C] rounded-b-md"
                  >
                    Excluir
                  </button>
              </div>, 
              document.body
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// Componente para exibir badge de status de desempenho
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'NAO USADO':
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: 'NÃO USADO' }
      case 'REJEITADO':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'REJEITADO' }
      case 'TESTANDO':
        return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', text: 'TESTANDO' }
      case 'RETESTAR':
        return { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', text: 'RETESTAR' }
      case 'NAO VALIDADO':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'NAO VALIDADO' }
      case 'VALIDADO':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', text: 'VALIDADO' }
      case 'SUPER VALIDADO':
        return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', text: 'SUPER VALIDADO' }
      default:
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: status }
    }
  }

  const { color, text } = getStatusConfig(status)

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs px-2 py-0.5 border font-medium text-center",
        color
      )}
    >
      {text}
    </Badge>
  )
}

// Componente para seleção direta de status (um clique)
function DirectStatusSelect({ 
  status, 
  onUpdate,
  disabled = false 
}: { 
  status: string
  onUpdate: (value: string) => Promise<void>
  disabled?: boolean
}) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async (value: string) => {
    if (value === status) {
      return
    }

    setIsUpdating(true)
    try {
      await onUpdate(value)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Select 
      value={status} 
      onValueChange={handleUpdate}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger 
        className={cn(
          "h-auto p-1 border-0 bg-transparent hover:bg-white/5 rounded transition-colors",
          "focus:ring-0 focus:ring-offset-0"
        )}
        title="Clique para alterar status"
      >
        <StatusBadge status={status} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NAO USADO">NÃO USADO</SelectItem>
        <SelectItem value="REJEITADO">REJEITADO</SelectItem>
        <SelectItem value="TESTANDO">TESTANDO</SelectItem>
        <SelectItem value="RETESTAR">RETESTAR</SelectItem>
        <SelectItem value="NAO VALIDADO">NAO VALIDADO</SelectItem>
        <SelectItem value="VALIDADO">VALIDADO</SelectItem>
        <SelectItem value="SUPER VALIDADO">SUPER VALIDADO</SelectItem>
      </SelectContent>
    </Select>
  )
}

// Componente inline para edição de status de desempenho
function InlineStatusSelect({ 
  status, 
  onUpdate, 
  onCancel,
  disabled = false 
}: { 
  status: string
  onUpdate: (value: string) => Promise<void>
  onCancel: () => void
  disabled?: boolean
}) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async (value: string) => {
    if (value === status) {
      onCancel()
      return
    }

    setIsUpdating(true)
    try {
      await onUpdate(value)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <Select 
      value={status} 
      onValueChange={handleUpdate}
      disabled={disabled || isUpdating}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <SelectTrigger 
        className="h-7 text-xs bg-[#2A2A2C] border-[#3A3A3C] focus:border-[#007AFF] w-full"
        onKeyDown={handleKeyDown}
        autoFocus
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NAO USADO">NÃO USADO</SelectItem>
        <SelectItem value="REJEITADO">REJEITADO</SelectItem>
        <SelectItem value="TESTANDO">TESTANDO</SelectItem>
        <SelectItem value="RETESTAR">RETESTAR</SelectItem>
        <SelectItem value="NAO VALIDADO">NAO VALIDADO</SelectItem>
        <SelectItem value="VALIDADO">VALIDADO</SelectItem>
        <SelectItem value="SUPER VALIDADO">SUPER VALIDADO</SelectItem>
      </SelectContent>
    </Select>
  )
}

// Componente inline para edição de copy
function InlineCopySelect({ 
  copyInitials, 
  members, 
  onUpdate, 
  onCancel,
  disabled = false 
}: { 
  copyInitials: string
  members: any[]
  onUpdate: (initials: string) => Promise<void>
  onCancel: () => void
  disabled?: boolean
}) {
  const [isUpdating, setIsUpdating] = useState(false)

  const getUserInitials = (name: string | null, email: string | null): string => {
    if (name && name.trim()) {
      return name.trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return "XX"
  }

  const handleUpdate = async (initials: string) => {
    if (initials === copyInitials) {
      onCancel()
      return
    }

    setIsUpdating(true)
    try {
      await onUpdate(initials)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <Select 
      value={copyInitials} 
      onValueChange={handleUpdate}
      disabled={disabled || isUpdating}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <SelectTrigger 
        className="h-7 text-xs bg-[#2A2A2C] border-[#3A3A3C] focus:border-[#007AFF] w-full"
        onKeyDown={handleKeyDown}
        autoFocus
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {members.map((member) => {
          const initials = getUserInitials(member.name, member.email)
          return (
            <SelectItem key={member.id} value={initials}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{initials}</span>
                <span className="text-xs text-white/70">- {member.name || member.email}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

// Componente inline para edição de editor
function InlineEditorSelect({ 
  editorInitials, 
  members, 
  onUpdate, 
  onCancel,
  disabled = false 
}: { 
  editorInitials: string
  members: any[]
  onUpdate: (initials: string) => Promise<void>
  onCancel: () => void
  disabled?: boolean
}) {
  const [isUpdating, setIsUpdating] = useState(false)

  const getUserInitials = (name: string | null, email: string | null): string => {
    if (name && name.trim()) {
      return name.trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return "XX"
  }

  const handleUpdate = async (initials: string) => {
    if (initials === editorInitials) {
      onCancel()
      return
    }

    setIsUpdating(true)
    try {
      await onUpdate(initials)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <Select 
      value={editorInitials} 
      onValueChange={handleUpdate}
      disabled={disabled || isUpdating}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <SelectTrigger 
        className="h-7 text-xs bg-[#2A2A2C] border-[#3A3A3C] focus:border-[#007AFF] w-full"
        onKeyDown={handleKeyDown}
        autoFocus
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {members.map((member) => {
          const initials = getUserInitials(member.name, member.email)
          return (
            <SelectItem key={member.id} value={initials}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{initials}</span>
                <span className="text-xs text-white/70">- {member.name || member.email}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

// Componente inline para edição de data
function InlineDateInput({ 
  date, 
  onUpdate, 
  onCancel,
  disabled = false 
}: { 
  date: string | null
  onUpdate: (date: string) => Promise<void>
  onCancel: () => void
  disabled?: boolean
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [value, setValue] = useState(date || '')

  const handleUpdate = async () => {
    if (value === date) {
      onCancel()
      return
    }

    setIsUpdating(true)
    try {
      await onUpdate(value)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter') {
      handleUpdate()
    }
  }

  const handleBlur = () => {
    handleUpdate()
  }

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled || isUpdating}
      autoFocus
      className="h-7 text-xs bg-[#2A2A2C] border border-[#3A3A3C] focus:border-[#007AFF] rounded px-2 text-white w-full focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
    />
  )
}