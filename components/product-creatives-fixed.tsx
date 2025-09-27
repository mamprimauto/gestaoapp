"use client"

import type React from "react"

import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useUploadQueue } from "./upload-queue-context"
import { useTaskData } from "./task-data"
import { useFileCache } from "@/hooks/use-file-cache"
import { getProductById, PRODUCTS } from "@/lib/products"
import { generateCreativeNomenclature } from "@/lib/products"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  Folder
} from "lucide-react"
import InlineFileUpload, { InlineFileUploadButton } from "./inline-file-upload"
import FileDownloadSelector from "./file-download-selector"
import { SimpleFileUpload } from "./simple-file-upload"
import CreativeTimeDisplay from "./creative-time-display"
import { CreativeFilters, type CreativeFilters as CreativeFiltersType } from "./creative-filters"

type Priority = "low" | "med" | "high" | null

function priorityRank(p: Priority) {
  return p === "high" ? 0 : p === "med" ? 1 : 2
}

interface ProductCreativesProps {
  productId: string
  onBack: () => void
  onCreateTask: () => void
}

export default function ProductCreatives({ productId, onBack, onCreateTask }: ProductCreativesProps) {
  const { tasks, loading, deleteTask, members, userId, updateTask, createVariation, duplicateTask } = useTaskData()
  const { preloadFiles } = useFileCache()
  const { toast } = useToast()
  const [openId, setOpenId] = useState<string | null>(null)
  const [filters, setFilters] = useState<CreativeFiltersType>({
    status: "all",
    copy: "all",
    editor: "all"
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const product = getProductById(productId)

  // Filter tasks to only show for this product
  const productTasks = useMemo(() => {
    if (!tasks) return []
    
    // Filtra apenas tarefas do produto
    const filteredTasks = tasks.filter(task => {
      // Verifica se pertence ao produto
      if (task.product_id !== productId) return false
      
      // Se não tiver parent_id, é um criativo principal
      if (!task.parent_id) return true
      
      // Se tiver parent_id, verifica se o parent também é do mesmo produto
      const parentTask = tasks.find(t => t.id === task.parent_id)
      return parentTask && parentTask.product_id === productId
    })
    
    return filteredTasks
  }, [tasks, productId])

  // Separar tarefas pendentes e concluídas
  const { pendingCreatives, completedCreatives } = useMemo(() => {
    // Filtrar apenas tarefas principais (sem parent_id)
    const mainTasks = productTasks.filter(task => !task.parent_id)
    const pending = mainTasks.filter(task => task.status !== 'done')
    const completed = mainTasks.filter(task => task.status === 'done')
    
    // Ordenar pendentes
    pending.sort((a, b) => {
      const readyA = (a.ready_files_count || 0) > 0
      const readyB = (b.ready_files_count || 0) > 0
      
      // Prioridade 1: Tarefas prontas (com arquivos) primeiro
      if (readyA && !readyB) return -1
      if (!readyA && readyB) return 1
      
      // Prioridade 2: Por prioridade
      const prioDiff = priorityRank(a.priority as Priority) - priorityRank(b.priority as Priority)
      if (prioDiff !== 0) return prioDiff
      
      // Prioridade 3: Data mais antiga primeiro
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateA - dateB
    })
    
    // Ordenar concluídos (mais recente primeiro)
    completed.sort((a, b) => {
      const dateA = a.completed_at || a.updated_at
      const dateB = b.completed_at || b.updated_at
      if (!dateA || !dateB) return 0
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
    
    return {
      pendingCreatives: pending,
      completedCreatives: completed
    }
  }, [productTasks])

  // Aplicar filtros
  const filteredPending = useMemo(() => {
    return pendingCreatives.filter(task => {
      // Filtro de status
      if (filters.status !== "all") {
        if (filters.status === "ready" && (!task.ready_files_count || task.ready_files_count === 0)) return false
        if (filters.status === "not-ready" && task.ready_files_count && task.ready_files_count > 0) return false
      }

      // Filtro de copy
      if (filters.copy !== "all" && task.data?.iniciais_copy !== filters.copy) return false

      // Filtro de editor  
      if (filters.editor !== "all" && task.data?.iniciais_editor !== filters.editor) return false

      return true
    })
  }, [pendingCreatives, filters])

  const filteredCompleted = useMemo(() => {
    return completedCreatives.filter(task => {
      // Filtro de copy
      if (filters.copy !== "all" && task.data?.iniciais_copy !== filters.copy) return false

      // Filtro de editor
      if (filters.editor !== "all" && task.data?.iniciais_editor !== filters.editor) return false

      return true
    })
  }, [completedCreatives, filters])

  // Get variations for a task
  const getVariations = useCallback((taskId: string) => {
    return productTasks.filter(task => task.parent_id === taskId)
  }, [productTasks])

  // Handle task completion toggle
  const handleToggleComplete = async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId)
    if (!task) return
    
    await updateTask(taskId, {
      status: task.status === 'done' ? 'pending' : 'done',
      completed_at: task.status === 'done' ? null : new Date().toISOString()
    })
  }

  // Handle ready toggle
  const handleToggleReady = async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId)
    if (!task) return
    
    const currentCount = task.ready_files_count || 0
    const newCount = currentCount > 0 ? 0 : 1
    
    await updateTask(taskId, {
      ready_files_count: newCount
    })
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const idsArray = Array.from(selectedIds)
    
    for (const id of idsArray) {
      await deleteTask(id)
    }
    
    setSelectedIds(new Set())
    setShowDeleteDialog(false)
    
    toast({
      title: "Criativos excluídos",
      description: `${idsArray.length} criativo(s) foram excluídos com sucesso.`,
    })
  }

  // Toggle group expansion
  const toggleGroup = (taskId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedGroups(newExpanded)
  }

  // Preload files for all tasks
  useEffect(() => {
    const allTaskIds = [...pendingCreatives, ...completedCreatives].map(t => t.id)
    
    if (allTaskIds.length > 0 && !loading) {
      void preloadFiles(allTaskIds, 'entregavel')
    }
  }, [pendingCreatives, completedCreatives, preloadFiles, loading])

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="hover:bg-[#2C2C2E]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-2xl font-bold text-white">
                {product?.name || 'Produto'}
              </h1>
            </div>
            <Button
              onClick={onCreateTask}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Criativo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <CreativeFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          copyOptions={Array.from(new Set(productTasks.map(t => t.data?.iniciais_copy).filter(Boolean)))}
          editorOptions={Array.from(new Set(productTasks.map(t => t.data?.iniciais_editor).filter(Boolean)))}
        />

        {/* Tasks Lists */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        ) : (
          <>
            {/* Pending Tasks */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Criativos Pendentes ({filteredPending.length})
                </h2>
                {selectedIds.size > 0 && (
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir ({selectedIds.size})
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {filteredPending.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isSelected={selectedIds.has(task.id)}
                    onToggleSelect={(id) => {
                      const newSelected = new Set(selectedIds)
                      if (newSelected.has(id)) {
                        newSelected.delete(id)
                      } else {
                        newSelected.add(id)
                      }
                      setSelectedIds(newSelected)
                    }}
                    onToggleComplete={handleToggleComplete}
                    onToggleReady={handleToggleReady}
                    onEdit={(task) => {
                      setEditingTask(task)
                      setShowEditDialog(true)
                    }}
                    onDelete={(id) => deleteTask(id)}
                    onDuplicate={(id) => duplicateTask(id)}
                    onCreateVariation={(id) => createVariation(id)}
                    variations={getVariations(task.id)}
                    isExpanded={expandedGroups.has(task.id)}
                    onToggleExpand={() => toggleGroup(task.id)}
                  />
                ))}
              </div>
            </div>

            {/* Completed Tasks */}
            {filteredCompleted.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Criativos Concluídos ({filteredCompleted.length})
                </h2>
                <div className="space-y-2 opacity-60">
                  {filteredCompleted.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isSelected={selectedIds.has(task.id)}
                      onToggleSelect={(id) => {
                        const newSelected = new Set(selectedIds)
                        if (newSelected.has(id)) {
                          newSelected.delete(id)
                        } else {
                          newSelected.add(id)
                        }
                        setSelectedIds(newSelected)
                      }}
                      onToggleComplete={handleToggleComplete}
                      onToggleReady={handleToggleReady}
                      onEdit={(task) => {
                        setEditingTask(task)
                        setShowEditDialog(true)
                      }}
                      onDelete={(id) => deleteTask(id)}
                      onDuplicate={(id) => duplicateTask(id)}
                      onCreateVariation={(id) => createVariation(id)}
                      variations={getVariations(task.id)}
                      isExpanded={expandedGroups.has(task.id)}
                      onToggleExpand={() => toggleGroup(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#1F1F1F] border-[#3A3A3C]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                Tem certeza que deseja excluir {selectedIds.size} criativo(s)? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#2C2C2E] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Dialog */}
        {showEditDialog && editingTask && (
          <EditTaskDialog
            task={editingTask}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSave={async (updates) => {
              await updateTask(editingTask.id, updates)
              setShowEditDialog(false)
              setEditingTask(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// Continue with TaskRow and other components...