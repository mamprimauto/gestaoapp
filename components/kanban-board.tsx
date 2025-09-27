"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Search, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTaskData } from "./task-data"
import KanbanColumn from "./kanban-column"
import KanbanTaskModal from "./kanban-task-modal"
import { TaskCreationModals } from "./task-creation-modals"
import { InboxTaskCreationModal } from "./inbox-task-creation-modal"
import type { Workspace } from "@/app/tarefas/page"
import { getSupabaseClient } from '@/lib/supabase/client'
import { startTimerForTask, stopTimerForTask, formatTime, getUserTimeForDate } from '@/lib/timer-utils'
import { useToast } from '@/hooks/use-toast'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  rectIntersection,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

interface KanbanBoardProps {
  workspace: Workspace
  onBack: () => void
  openTaskId?: string | null
  onTaskOpened?: () => void
}

export type KanbanColumn = {
  id: string
  title: string
  icon: string
  position: number
  color?: string
}

// Colunas obrigatórias que não podem ser editadas ou excluídas
const REQUIRED_COLUMNS = ['inbox', 'todo', 'in-progress', 'done']

const getDefaultColumns = (): KanbanColumn[] => [
  { id: 'inbox', title: 'Lembretes', icon: '📝', position: 0, color: '#8B5CF6' },
  { id: 'todo', title: 'Pendentes', icon: '📋', position: 1, color: '#F59E0B' },
  { id: 'in-progress', title: 'Em Progresso', icon: '⚡', position: 2, color: '#10B981' },
  { id: 'done', title: 'Concluído', icon: '✅', position: 3, color: '#6B7280' }
]

export default function KanbanBoard({ workspace, onBack, openTaskId, onTaskOpened }: KanbanBoardProps) {
  const { 
    tasks, 
    addTask, 
    addComment,
    updateTask,
    deleteTask,
    duplicateTask, 
    members, 
    getKanbanColumns, 
    createKanbanColumn, 
    updateKanbanColumn, 
    deleteKanbanColumn 
  } = useTaskData()
  const { toast } = useToast()
  const router = useRouter()
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [loadingColumns, setLoadingColumns] = useState(true)
  const [useLocalStorage, setUseLocalStorage] = useState(false)
  const [creatingTask, setCreatingTask] = useState<string | null>(null)
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false)
  const [showInboxCreationModal, setShowInboxCreationModal] = useState(false)
  const [creationColumnId, setCreationColumnId] = useState<string>("")
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null)
  const [activeTask, setActiveTask] = useState<any | null>(null)
  const [userTimes, setUserTimes] = useState<Record<string, { today: number; yesterday: number }>>({})
  
  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduzido para iniciar o drag mais rápido
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Reduzido para mobile mais responsivo
        tolerance: 5,
      },
    })
  )

  // Função para garantir que as colunas obrigatórias sempre existam com nomes corretos
  const ensureRequiredColumns = (existingColumns: KanbanColumn[], forceReset = false): KanbanColumn[] => {
    const defaultCols = getDefaultColumns()
    let result = [...existingColumns]
    
    // Migrar coluna "review" para "inbox" se existir
    const reviewColumnIndex = result.findIndex(col => col.id === 'review')
    if (reviewColumnIndex !== -1) {
      result[reviewColumnIndex] = {
        ...result[reviewColumnIndex],
        id: 'inbox',
        title: 'Lembretes',
        icon: '📥',
        position: 0
      }
    }
    
    // Migrar coluna "reminders" para "inbox" se existir
    const remindersColumnIndex = result.findIndex(col => col.id === 'reminders')
    if (remindersColumnIndex !== -1) {
      result[remindersColumnIndex] = {
        ...result[remindersColumnIndex],
        id: 'inbox',
        title: 'Lembretes',
        icon: '📥',
        position: 0
      }
    }
    
    // Remover duplicatas por ID (importante após a migração)
    const uniqueColumns = result.filter((col, index, self) => 
      self.findIndex(c => c.id === col.id) === index
    )
    result = uniqueColumns
    
    // Verificar cada coluna obrigatória
    defaultCols.forEach(defaultCol => {
      const existingIndex = result.findIndex(col => col.id === defaultCol.id)
      
      if (existingIndex === -1) {
        // Adicionar coluna faltante
        result.push(defaultCol)
      } else if (forceReset || result[existingIndex].title !== defaultCol.title) {
        // Restaurar nome original se foi modificado ou forçar reset
        result[existingIndex] = {
          ...result[existingIndex],
          title: defaultCol.title,
          icon: defaultCol.icon,
          position: defaultCol.position
        }
      }
    })
    
    // Reordenar para garantir que as colunas obrigatórias estejam nas posições corretas
    result.sort((a, b) => {
      const aIsRequired = REQUIRED_COLUMNS.includes(a.id)
      const bIsRequired = REQUIRED_COLUMNS.includes(b.id)
      
      // Colunas obrigatórias primeiro, em suas posições definidas
      if (aIsRequired && bIsRequired) {
        const aDefault = defaultCols.find(d => d.id === a.id)
        const bDefault = defaultCols.find(d => d.id === b.id)
        return (aDefault?.position || 0) - (bDefault?.position || 0)
      }
      if (aIsRequired) return -1
      if (bIsRequired) return 1
      
      // Colunas customizadas por posição
      return a.position - b.position
    })
    
    return result
  }

  // Load columns from database or localStorage on mount
  useEffect(() => {
    async function loadColumns() {
      setLoadingColumns(true)
      
      // Clear any corrupted localStorage data that might have duplicates
      const lsKey = `kanban-columns-${workspace.id}`
      const saved = localStorage.getItem(lsKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const hasDuplicates = parsed.length !== new Set(parsed.map((col: any) => col.id)).size
          if (hasDuplicates) {
            localStorage.removeItem(lsKey)
          }
        } catch {
          localStorage.removeItem(lsKey)
        }
      }
      
      try {
        // Verificar se há sessão ativa antes de tentar buscar colunas
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // Usuário não autenticado - usar localStorage
          setUseLocalStorage(true)
          loadFromLocalStorage()
          setLoadingColumns(false)
          return
        }

        const dbColumns = await getKanbanColumns(workspace.id)
        
        if (dbColumns.length === 0) {

          // Verificar se há usuário logado antes de tentar criar no banco
          const supabase = await getSupabaseClient()
          const { data: { session } } = await supabase.auth.getSession()
          
          if (!session) {
            // Já tratado acima
            setUseLocalStorage(true)
            loadFromLocalStorage()
          } else {

            // First time - create default columns in database
            const defaultCols = getDefaultColumns()
            const createdColumns: KanbanColumn[] = []
            
            for (const col of defaultCols) {
              const created = await createKanbanColumn(workspace.id, {
                column_id: col.id,
                title: col.title,
                color: col.color || '#6B7280',
                icon: col.icon,
                position: col.position
              })
              if (created) {
                createdColumns.push({
                  id: created.column_id,
                  title: created.title,
                  icon: created.icon,
                  position: created.position
                })
              }
            }
            
            if (createdColumns.length > 0) {
              // Garantir ordem e nomes corretos
              const finalCols = ensureRequiredColumns(createdColumns, true)
              setColumns(finalCols)
              setUseLocalStorage(false)
            } else {

              // Fallback to localStorage
              setUseLocalStorage(true)
              loadFromLocalStorage()
            }
          }
        } else {

          // Convert database columns to local format
          const convertedColumns = dbColumns.map(dbCol => ({
            id: dbCol.column_id,
            title: dbCol.title,
            icon: dbCol.icon,
            position: dbCol.position
          }))
          
          // Check for duplicates
          const uniqueIds = new Set(convertedColumns.map(col => col.id))
          let finalColumns = convertedColumns
          
          if (uniqueIds.size !== convertedColumns.length) {

            // Remove duplicates by id
            finalColumns = convertedColumns.filter((col, index, self) => 
              self.findIndex(c => c.id === col.id) === index
            )
          }
          
          // Garantir que as colunas obrigatórias existam e tenham nomes corretos
          finalColumns = ensureRequiredColumns(finalColumns, true) // Forçar reset dos nomes
          
          // Migrar colunas "review" e "reminders" para "inbox" no banco se existirem
          const hasReviewColumn = convertedColumns.some(col => col.id === 'review')
          const hasRemindersColumn = convertedColumns.some(col => col.id === 'reminders')
          
          if (hasReviewColumn) {
            await updateKanbanColumn(workspace.id, 'review', {
              title: 'Lembretes',
              position: 0
            })
          }
          
          if (hasRemindersColumn) {
            await updateKanbanColumn(workspace.id, 'reminders', {
              title: 'Lembretes',
              position: 0
            })
          }
          
          // Se alguma coluna obrigatória foi adicionada, salvar no banco
          const missingRequired = REQUIRED_COLUMNS.filter(reqId => 
            !convertedColumns.find(col => col.id === reqId)
          )
          
          if (missingRequired.length > 0) {
            const defaultCols = getDefaultColumns()
            for (const reqId of missingRequired) {
              const defaultCol = defaultCols.find(d => d.id === reqId)
              if (defaultCol) {
                await createKanbanColumn(workspace.id, {
                  column_id: defaultCol.id,
                  title: defaultCol.title,
                  color: defaultCol.color || '#6B7280',
                  icon: defaultCol.icon,
                  position: defaultCol.position
                })
              }
            }
          }
          
          setColumns(finalColumns)
          setUseLocalStorage(false)
        }
      } catch (error: any) {

        // Fallback to localStorage
        setUseLocalStorage(true)
        loadFromLocalStorage()
      } finally {
        setLoadingColumns(false)
      }
    }
    
    function loadFromLocalStorage() {
      const saved = localStorage.getItem(`kanban-columns-${workspace.id}`)
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved)
          // Garantir que as colunas obrigatórias existam e tenham nomes corretos
          const finalColumns = ensureRequiredColumns(savedColumns, true) // Forçar reset
          
          // Remover duplicatas adicionais por segurança
          const uniqueFinalColumns = finalColumns.filter((col, index, self) => 
            self.findIndex(c => c.id === col.id) === index
          )
          
          setColumns(uniqueFinalColumns)
          // Atualizar localStorage com colunas corrigidas
          localStorage.setItem(`kanban-columns-${workspace.id}`, JSON.stringify(uniqueFinalColumns))
        } catch {
          setColumns(getDefaultColumns())
        }
      } else {
        setColumns(getDefaultColumns())
      }
    }
    
    loadColumns()
  }, [workspace.id, getKanbanColumns, createKanbanColumn])

  // Save to localStorage when using fallback mode
  useEffect(() => {
    if (useLocalStorage && columns.length > 0) {
      localStorage.setItem(`kanban-columns-${workspace.id}`, JSON.stringify(columns))
    }
  }, [columns, workspace.id, useLocalStorage])

  // Migrate tasks from "review" and "reminders" columns to "inbox" when columns are loaded
  useEffect(() => {
    if (tasks.length > 0 && columns.length > 0) {
      const tasksToMigrate = tasks.filter(task => 
        task.tag === `kanban-${workspace.id}` && 
        (task.kanban_column === 'review' || task.kanban_column === 'reminders')
      )
      
      if (tasksToMigrate.length > 0) {
        tasksToMigrate.forEach(task => {
          updateTask(task.id, { kanban_column: 'inbox' })
        })
      }
    }
  }, [tasks, columns, workspace.id, updateTask])

  // Auto-open task if openTaskId is provided
  useEffect(() => {
    if (openTaskId && tasks.length > 0 && !isTaskModalOpen) {
      const taskToOpen = tasks.find(task => task.id === openTaskId)
      if (taskToOpen) {
        setSelectedTask(taskToOpen)
        setIsTaskModalOpen(true)
        onTaskOpened?.()
        
        // Remove the openTask parameter from URL
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('openTask')
          window.history.replaceState({}, '', url.toString())
        }
      }
    }
  }, [openTaskId, tasks, isTaskModalOpen, onTaskOpened])

  // Filtrar tarefas do workspace atual
  const workspaceTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      // Usar tag para identificar workspace
      const isWorkspaceTask = task.tag === `kanban-${workspace.id}`
      
      // Aplicar filtro de busca se houver
      if (searchTerm) {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
        return isWorkspaceTask && matchesSearch
      }
      
      return isWorkspaceTask
    })

    return filtered
  }, [tasks, workspace.id, searchTerm])

  // Organizar tarefas por coluna
  const tasksByColumn = useMemo(() => {
    const organized: Record<string, any[]> = {}
    
    columns.forEach(column => {
      const columnTasks = workspaceTasks.filter(task => {
        // Se a tarefa não tem coluna definida, colocar em "A Fazer"
        const taskColumn = task.kanban_column || 'todo'
        return taskColumn === column.id
      })
      
      // Ordenar todas as colunas por updated_at (ou created_at se não houver) - mais recentes primeiro
      organized[column.id] = columnTasks.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime()
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime()
        return dateB - dateA // Ordem decrescente (mais recentes primeiro)
      })
    })
    
    return organized
  }, [workspaceTasks, columns])

  const handleCreateTask = (columnId: string) => {
    setCreationColumnId(columnId)
    if (columnId === 'inbox') {
      setShowInboxCreationModal(true)
    } else {
      setShowTaskCreationModal(true)
    }
  }

  const handleTaskCreationComplete = async (taskData: { title: string; dueDate?: string; columnId: string; assigneeIds?: string[] }) => {
    if (creatingTask) return // Evitar múltiplas criações simultâneas
    
    setCreatingTask(taskData.columnId)
    try {
      const newTask = {
        title: taskData.title,
        description: taskData.assigneeIds && taskData.assigneeIds.length > 0 
          ? JSON.stringify({ assignees: taskData.assigneeIds })
          : "",
        tag: `kanban-${workspace.id}`,
        kanban_column: taskData.columnId,
        priority: null,
        due_date: taskData.dueDate || null,
        assignee_id: taskData.assigneeIds && taskData.assigneeIds.length > 0 ? taskData.assigneeIds[0] : null
      }
      
      const createdTask = await addTask(newTask)
      
      // Tarefa criada com sucesso - não abrir detalhes automaticamente
      if (createdTask) {
        toast({
          title: "Tarefa criada",
          description: "A tarefa foi criada com sucesso.",
        })
      }
    } finally {
      setCreatingTask(null)
    }
  }

  const handleInboxTaskCreationComplete = async (taskData: { title: string; priority?: string; tags: any[]; content: string; columnId: string }) => {
    if (creatingTask) return // Evitar múltiplas criações simultâneas
    
    setCreatingTask(taskData.columnId)
    try {
      // Estruturar os dados da tarefa da inbox
      const inboxData = {
        tags: taskData.tags,
        content: taskData.content,
        type: 'inbox'
      }

      const newTask = {
        title: taskData.title,
        description: JSON.stringify(inboxData),
        tag: `kanban-${workspace.id}`,
        kanban_column: taskData.columnId,
        priority: taskData.priority || null,
        due_date: null
      }
      
      const createdTask = await addTask(newTask)
      
      // Tarefa criada com sucesso
      if (createdTask) {
        // Se há conteúdo/descrição, adicionar como primeiro comentário
        if (taskData.content && taskData.content.trim()) {
          try {
            await addComment(createdTask.id, taskData.content.trim())
          } catch (error) {
            console.error('Erro ao adicionar descrição como comentário:', error)
          }
        }
        
        toast({
          title: "Item criado",
          description: "Item da caixa de entrada criado com sucesso.",
        })
      }
    } finally {
      setCreatingTask(null)
    }
  }

  const handleMoveTask = async (taskId: string, newColumnId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    const currentColumn = task.kanban_column || 'todo'
    
    // Verificar se é uma tarefa temporária (ainda não salva no banco)
    const isTemporaryTask = taskId.toString().startsWith('temp-')
    
    // Lógica do timer automático - apenas para tarefas reais (não temporárias)
    if (!isTemporaryTask) {
      try {
        if (newColumnId === 'in-progress' && currentColumn !== 'in-progress') {
          // Movendo para "Em Progresso" - iniciar timer
          const result = await startTimerForTask(taskId)
          if (result.success) {
            toast({
              title: "Timer iniciado",
              description: `Cronômetro iniciado para "${task.title}"`,
              duration: 3000
            })
          } else {
            // Se der erro, continua com a movimentação mas avisa
            toast({
              title: "Aviso",
              description: `Tarefa movida mas timer não pôde ser iniciado: ${result.error}`,
              variant: "destructive",
              duration: 5000
            })
          }
        } else if (currentColumn === 'in-progress' && newColumnId !== 'in-progress') {
          // Saindo de "Em Progresso" - parar timer
          const result = await stopTimerForTask(taskId)
          if (result.success) {
            const timeText = result.duration ? formatTime(result.duration) : 'tempo registrado'
            toast({
              title: "Timer pausado",
              description: `Timer pausado para "${task.title}". ${timeText}`,
              duration: 3000
            })
          } else {
            // Se der erro, continua com a movimentação mas avisa
            toast({
              title: "Aviso", 
              description: `Tarefa movida mas timer não pôde ser pausado: ${result.error}`,
              variant: "destructive",
              duration: 5000
            })
          }
        }
      } catch (error) {
        // Se der erro na lógica do timer, continua com a movimentação
        console.error("Erro na lógica do timer:", error)
      }
    }
    
    // Sempre atualizar a coluna da tarefa e updated_at para aparecer no topo
    await updateTask(taskId, {
      kanban_column: newColumnId,
      updated_at: new Date().toISOString()
    })
  }

  const handleTaskClick = (task: any) => {
    setSelectedTask(task)
    setIsTaskModalOpen(true)
  }

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false)
    setSelectedTask(null)
  }

  // Column management functions
  const handleAddColumn = async () => {
    // Garantir que novas colunas sejam adicionadas após as obrigatórias
    const customColumns = columns.filter(col => !REQUIRED_COLUMNS.includes(col.id))
    const newPosition = 4 + customColumns.length // 4 colunas obrigatórias + colunas customizadas
    
    const newColumnData = {
      column_id: `col-${Date.now()}`,
      title: 'Nova Coluna',
      icon: '📝',
      color: '#6B7280', // Cor padrão cinza
      position: newPosition
    }
    
    if (useLocalStorage) {
      // Using localStorage fallback
      const newColumn: KanbanColumn = {
        id: newColumnData.column_id,
        title: newColumnData.title,
        icon: newColumnData.icon,
        position: newColumnData.position
      }
      setColumns(prev => [...prev, newColumn])
    } else {
      // Try database first
      const created = await createKanbanColumn(workspace.id, newColumnData)
      if (created) {
        const newColumn: KanbanColumn = {
          id: created.column_id,
          title: created.title,
          icon: created.icon,
          position: created.position
        }
        setColumns(prev => [...prev, newColumn])
      } else {
        // Fallback to localStorage

        setUseLocalStorage(true)
        const newColumn: KanbanColumn = {
          id: newColumnData.column_id,
          title: newColumnData.title,
          icon: newColumnData.icon,
          position: newColumnData.position
        }
        setColumns(prev => [...prev, newColumn])
      }
    }
  }

  const handleUpdateColumn = async (columnId: string, updates: Partial<KanbanColumn>) => {
    // Não permitir editar título das colunas obrigatórias
    if (REQUIRED_COLUMNS.includes(columnId) && updates.title !== undefined) {
      return
    }
    
    // Permitir apenas mudança de ícone para colunas obrigatórias
    const filteredUpdates = REQUIRED_COLUMNS.includes(columnId) 
      ? { icon: updates.icon } 
      : updates
    
    // Optimistic update
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, ...filteredUpdates } : col
    ))
    
    if (!useLocalStorage) {
      // Try to update in database
      const dbUpdates: Partial<Pick<import('./task-data').KanbanColumn, 'title' | 'icon' | 'position'>> = {}
      if (filteredUpdates.title !== undefined) dbUpdates.title = filteredUpdates.title
      if (filteredUpdates.icon !== undefined) dbUpdates.icon = filteredUpdates.icon
      if (filteredUpdates.position !== undefined) dbUpdates.position = filteredUpdates.position
      
      const updated = await updateKanbanColumn(workspace.id, columnId, dbUpdates)
      if (!updated) {

        setUseLocalStorage(true)
        // Keep the optimistic update since we're now using localStorage
      }
    }
    // If using localStorage, the optimistic update is sufficient
  }

  const handleDeleteColumn = async (columnId: string) => {
    // Não permitir excluir colunas obrigatórias
    if (REQUIRED_COLUMNS.includes(columnId)) {
      return
    }
    
    // Move all tasks from deleted column to first column
    const tasksInColumn = workspaceTasks.filter(task => task.kanban_column === columnId)
    const firstColumnId = columns[0]?.id || 'todo'
    
    // Move tasks to first column
    for (const task of tasksInColumn) {
      await updateTask(task.id, { kanban_column: firstColumnId })
    }
    
    if (!useLocalStorage) {
      // Try to delete from database
      await deleteKanbanColumn(workspace.id, columnId)
    }
    
    // Remove from local state (works for both database and localStorage)
    setColumns(prev => prev.filter(col => col.id !== columnId))
  }

  const handleReorderColumns = async (newColumns: KanbanColumn[]) => {
    // Optimistic update
    const reorderedColumns = newColumns.map((col, index) => ({
      ...col,
      position: index
    }))
    setColumns(reorderedColumns)
    
    // Update positions in database
    for (const col of reorderedColumns) {
      await updateKanbanColumn(workspace.id, col.id, { position: col.position })
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    
    if (active.data.current?.type === 'column') {
      // Não permitir arrastar colunas obrigatórias
      if (REQUIRED_COLUMNS.includes(active.id as string)) {
        return
      }
      setActiveColumn(active.data.current.column)
    } else if (active.data.current?.type === 'task') {
      setActiveTask(active.data.current.task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over) return
    
    const activeId = active.id
    const overId = over.id
    
    if (activeId === overId) return
    
    const isActiveATask = active.data.current?.type === 'task'
    const isOverATask = over.data.current?.type === 'task'
    const isOverAColumn = over.data.current?.type === 'column'
    
    // Moving a task over another task
    if (isActiveATask && isOverATask) {
      const activeTask = tasks.find(t => t.id === activeId)
      const overTask = tasks.find(t => t.id === overId)
      
      if (activeTask && overTask && activeTask.kanban_column !== overTask.kanban_column) {
        // Impedir movimento DE Lembretes
        if (activeTask.kanban_column === 'inbox') {
          toast({
            title: "Movimento não permitido",
            description: "Tarefas de Lembretes não podem ser movidas. Use os botões de ação dentro da tarefa.",
            variant: "destructive"
          })
          return
        }
        
        // Impedir movimento PARA Lembretes
        if (overTask.kanban_column === 'inbox') {
          toast({
            title: "Movimento não permitido",
            description: "Não é possível arrastar tarefas para Lembretes.",
            variant: "destructive"
          })
          return
        }
        
        // Move task to the column of the task it's hovering over
        handleMoveTask(activeId as string, overTask.kanban_column)
      }
    }
    
    // Moving a task directly over a column
    if (isActiveATask && isOverAColumn) {
      const activeTask = tasks.find(t => t.id === activeId)
      
      if (activeTask && activeTask.kanban_column !== overId) {
        // Impedir movimento DE Lembretes
        if (activeTask.kanban_column === 'inbox') {
          toast({
            title: "Movimento não permitido",
            description: "Tarefas de Lembretes não podem ser movidas. Use os botões de ação dentro da tarefa.",
            variant: "destructive"
          })
          return
        }
        
        // Impedir movimento PARA Lembretes
        if (overId === 'inbox') {
          toast({
            title: "Movimento não permitido",
            description: "Não é possível arrastar tarefas para Lembretes.",
            variant: "destructive"
          })
          return
        }
        
        handleMoveTask(activeId as string, overId as string)
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveColumn(null)
    setActiveTask(null)
    
    if (!over) return
    
    const activeId = active.id
    const overId = over.id
    
    if (activeId === overId) return
    
    const isActiveAColumn = active.data.current?.type === 'column'
    const isActiveATask = active.data.current?.type === 'task'
    
    // Handle column reordering - apenas colunas não obrigatórias podem ser reordenadas
    if (isActiveAColumn && over.data.current?.type === 'column') {
      // Não permitir reordenar colunas obrigatórias
      if (REQUIRED_COLUMNS.includes(activeId as string) || REQUIRED_COLUMNS.includes(overId as string)) {
        return
      }
      
      const activeColumnIndex = columns.findIndex(col => col.id === activeId)
      const overColumnIndex = columns.findIndex(col => col.id === overId)
      
      if (activeColumnIndex !== -1 && overColumnIndex !== -1 && activeColumnIndex !== overColumnIndex) {
        const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex)
        handleReorderColumns(newColumns)
      }
    }
    
    // Task movement is already handled in handleDragOver for better UX
  }

  const totalTasks = workspaceTasks.length
  const completedTasks = tasksByColumn['done']?.length || 0
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calcular pendentes do Clélio e Danilo (apenas para workspace de edição)
  // Buscar diretamente nas tarefas de materiais, independente da tag
  const { pendingClelio, pendingDanilo } = useMemo(() => {
    if (workspace.id !== 'edicao') {
      return { pendingClelio: 0, pendingDanilo: 0 }
    }

    // Encontrar Clélio e Danilo por nome
    const clelio = members.find(m => 
      m.name?.toLowerCase().includes('clelio') || 
      m.name?.toLowerCase().includes('clélio') ||
      m.email?.toLowerCase().includes('clelio') ||
      m.email?.toLowerCase().includes('clélio')
    )
    const danilo = members.find(m => 
      m.name?.toLowerCase().includes('danilo') || 
      m.email?.toLowerCase().includes('danilo')
    )

    // Buscar todas as tarefas de materiais diretamente (independente da tag)
    const allMaterialTasks = tasks.filter(t => 
      t.owner && (t.owner === 'nutra-memoria' || t.owner === 'nutra-emagrecimento')
    )
    
    // Contar pendentes específicos (não marcados com check = is_ready !== true)
    const pendingClelio = clelio ? allMaterialTasks.filter(t => {
      if (t.assignee_id !== clelio.id) return false
      try {
        const parsed = JSON.parse(t.description || '{}')
        return parsed.is_ready !== true
      } catch {
        return true // Se não conseguir parse, considera pendente
      }
    }).length : 0
    
    const pendingDanilo = danilo ? allMaterialTasks.filter(t => {
      if (t.assignee_id !== danilo.id) return false
      try {
        const parsed = JSON.parse(t.description || '{}')
        return parsed.is_ready !== true
      } catch {
        return true // Se não conseguir parse, considera pendente
      }
    }).length : 0

    return { pendingClelio, pendingDanilo }
  }, [tasks, workspace.id, members])

  // Carregar tempo trabalhado dos usuários - apenas para workspaces que precisam
  useEffect(() => {
    const workspacesWithTime = ['edicao', 'igor', 'italo', 'copy', 'trafego']
    if (!workspacesWithTime.includes(workspace.id)) {
      return
    }

    async function loadUserTimes() {
      // Usar fuso horário de Brasília para gerar as datas
      const now = new Date()
      const brasiliaOffset = -3 * 60 // UTC-3 em minutos
      const brasiliaTime = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000)
      
      const today = brasiliaTime.toISOString().split('T')[0]
      const yesterdayTime = new Date(brasiliaTime.getTime() - 24 * 60 * 60 * 1000)
      const yesterday = yesterdayTime.toISOString().split('T')[0]
      
      try {
        // Definir usuários baseado no workspace
        const usersByWorkspace: Record<string, { email: string; name: string }[]> = {
          'edicao': [
            { email: 'cleliolucas@gmail.com', name: 'clelio' },
            { email: 'danilo.dlisboa@gmail.com', name: 'danilo' }
          ],
          'igor': [{ email: 'igorzimpel@gmail.com', name: 'igor' }],
          'italo': [{ email: 'italonsbarrozo@gmail.com', name: 'italo' }],
          'copy': [{ email: 'rluciano158@hotmail.com', name: 'edson' }],
          'trafego': [{ email: 'artur.diniz1@gmail.com', name: 'artur' }],
          'particular': [
            { email: 'igorzimpel@gmail.com', name: 'igor' },
            { email: 'italonsbarrozo@gmail.com', name: 'italo' },
            { email: 'cleliolucas@gmail.com', name: 'clelio' },
            { email: 'danilo.dlisboa@gmail.com', name: 'danilo' },
            { email: 'rluciano158@hotmail.com', name: 'edson' },
            { email: 'artur.diniz1@gmail.com', name: 'artur' }
          ]
        }
        
        const users = usersByWorkspace[workspace.id] || []
        const userTimesData: Record<string, { today: number; yesterday: number }> = {}
        
        await Promise.all(users.map(async (user) => {
          try {
            const [todayResult, yesterdayResult] = await Promise.all([
              getUserTimeForDate(user.email, today),
              getUserTimeForDate(user.email, yesterday)
            ])
            
            userTimesData[user.name] = {
              today: todayResult.totalSeconds,
              yesterday: yesterdayResult.totalSeconds
            }
          } catch (error) {
            console.log(`Erro ao buscar tempo para ${user.name}:`, error)
            userTimesData[user.name] = { today: 0, yesterday: 0 }
          }
        }))
        
        setUserTimes(userTimesData)
      } catch (error) {
        console.error('Erro ao carregar tempos dos usuários:', error)
      }
    }
    
    // Carregar imediatamente
    loadUserTimes()
    
    // Atualizar a cada 30 segundos para sincronização mais frequente
    const interval = setInterval(loadUserTimes, 30000)
    
    // Escutar eventos de timer para atualização imediata
    const handleTimerEvent = () => {
      loadUserTimes()
    }
    
    window.addEventListener('timerStarted', handleTimerEvent)
    window.addEventListener('timerStopped', handleTimerEvent)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('timerStarted', handleTimerEvent)
      window.removeEventListener('timerStopped', handleTimerEvent)
    }
  }, [workspace.id])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div 
        className="relative px-6 py-4 border-b border-white/10"
        style={{ backgroundColor: workspace.color + '10' }}
      >
        {/* Background pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{ backgroundColor: workspace.color }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shadow-lg"
                  style={{ backgroundColor: workspace.color + '20', borderColor: workspace.color + '40' }}
                >
                  <span>{workspace.icon}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
                  <p className="text-white/70 text-sm">{workspace.description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Botão para restaurar colunas obrigatórias */}
              {(() => {
                const defaultCols = getDefaultColumns()
                const hasAllRequired = REQUIRED_COLUMNS.every(reqId => {
                  const col = columns.find(c => c.id === reqId)
                  const defaultCol = defaultCols.find(d => d.id === reqId)
                  // Verificar se existe E tem o nome correto
                  return col && col.title === defaultCol?.title
                })
                return !hasAllRequired
              })() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Forçar reset completo das colunas obrigatórias
                    const restoredColumns = ensureRequiredColumns(columns, true)
                    
                    // Remover duplicatas por segurança
                    const uniqueRestoredColumns = restoredColumns.filter((col, index, self) => 
                      self.findIndex(c => c.id === col.id) === index
                    )
                    
                    setColumns(uniqueRestoredColumns)
                    
                    // Salvar no banco se não estiver usando localStorage
                    if (!useLocalStorage) {
                      const defaultCols = getDefaultColumns()
                      for (const defaultCol of defaultCols) {
                        const exists = columns.find(c => c.id === defaultCol.id)
                        if (!exists) {
                          // Criar coluna faltante
                          await createKanbanColumn(workspace.id, {
                            column_id: defaultCol.id,
                            title: defaultCol.title,
                            color: defaultCol.color || '#6B7280',
                            icon: defaultCol.icon,
                            position: defaultCol.position
                          })
                        } else if (exists.title !== defaultCol.title) {
                          // Atualizar nome da coluna existente
                          await updateKanbanColumn(workspace.id, defaultCol.id, {
                            title: defaultCol.title,
                            position: defaultCol.position
                          })
                        }
                      }
                    } else {
                      // Atualizar localStorage
                      localStorage.setItem(`kanban-columns-${workspace.id}`, JSON.stringify(uniqueRestoredColumns))
                    }
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/10 border-white/20"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restaurar Colunas
                </Button>
              )}
              
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 w-64"
                />
              </div>
              
            </div>
          </div>

          {/* Estatísticas */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-white/80">
              <div className="text-white/60">Progresso:</div>
              <div className="bg-black/20 rounded-full h-2 w-24 overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 rounded-full bg-green-500"
                  style={{ 
                    width: `${progressPercentage}%`
                  }}
                />
              </div>
              <span className="text-white font-medium">{progressPercentage}%</span>
            </div>

            {/* Tempo trabalhado - área do Igor */}
            {workspace.id === 'igor' && (
              <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="font-medium text-white/90">Igor</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Hoje:</span>
                    <span className="font-mono text-cyan-400">
                      {userTimes.igor ? formatTime(userTimes.igor.today) : '00:00:00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Ontem:</span>
                    <span className="font-mono text-white/50">
                      {userTimes.igor ? formatTime(userTimes.igor.yesterday) : '00:00:00'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tempo trabalhado - área do Italo */}
            {workspace.id === 'italo' && (
              <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="font-medium text-white/90">Italo</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Hoje:</span>
                    <span className="font-mono text-amber-400">
                      {userTimes.italo ? formatTime(userTimes.italo.today) : '00:00:00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Ontem:</span>
                    <span className="font-mono text-white/50">
                      {userTimes.italo ? formatTime(userTimes.italo.yesterday) : '00:00:00'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tempo trabalhado - Copy */}
            {workspace.id === 'copy' && (
              <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-400" />
                  <span className="font-medium text-white/90">Edson</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Hoje:</span>
                    <span className="font-mono text-orange-400">
                      {userTimes.edson ? formatTime(userTimes.edson.today) : '00:00:00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Ontem:</span>
                    <span className="font-mono text-white/50">
                      {userTimes.edson ? formatTime(userTimes.edson.yesterday) : '00:00:00'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tempo trabalhado - Tráfego Pago */}
            {workspace.id === 'trafego' && (
              <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="font-medium text-white/90">Artur</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Hoje:</span>
                    <span className="font-mono text-purple-400">
                      {userTimes.artur ? formatTime(userTimes.artur.today) : '00:00:00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/60">Ontem:</span>
                    <span className="font-mono text-white/50">
                      {userTimes.artur ? formatTime(userTimes.artur.yesterday) : '00:00:00'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tempo trabalhado Clélio e Danilo - apenas para workspace de edição */}
            {workspace.id === 'edicao' && (
              <div className="flex items-center gap-6 text-sm">
                {/* Tempo do Clélio */}
                <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="font-medium text-white/90">Clélio</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-white/60">Hoje:</span>
                      <span className="font-mono text-blue-400">
                        {userTimes.clelio ? formatTime(userTimes.clelio.today) : '00:00:00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-white/60">Ontem:</span>
                      <span className="font-mono text-white/50">
                        {userTimes.clelio ? formatTime(userTimes.clelio.yesterday) : '00:00:00'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Tempo do Danilo */}
                <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="font-medium text-white/90">Danilo</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-white/60">Hoje:</span>
                      <span className="font-mono text-green-400">
                        {userTimes.danilo ? formatTime(userTimes.danilo.today) : '00:00:00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-white/60">Ontem:</span>
                      <span className="font-mono text-white/50">
                        {userTimes.danilo ? formatTime(userTimes.danilo.yesterday) : '00:00:00'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => router.push('/materiais')}
                  className="ml-4 px-3 py-1 text-xs font-medium transition-all hover:scale-105 bg-gray-600/20 text-gray-400 border border-gray-600/40 hover:bg-gray-600/30 hover:text-gray-300"
                >
                  Ir para materiais
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden bg-[#0D0D0F]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="h-full overflow-x-auto">
            {loadingColumns ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white/60 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto mb-4"></div>
                  <p>Carregando colunas...</p>
                </div>
              </div>
            ) : (
              <SortableContext
                items={columns.map(col => col.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-4 p-4 h-full min-w-max">
                  {columns.sort((a, b) => a.position - b.position).map((column) => (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      tasks={tasksByColumn[column.id] || []}
                      workspace={workspace}
                      onCreateTask={() => handleCreateTask(column.id)}
                      onMoveTask={handleMoveTask}
                      members={members}
                      onTaskClick={handleTaskClick}
                      onUpdateColumn={handleUpdateColumn}
                      onDeleteColumn={handleDeleteColumn}
                      onDeleteTask={deleteTask}
                      onDuplicateTask={duplicateTask}
                      isCreatingTask={creatingTask === column.id}
                      isRequired={REQUIRED_COLUMNS.includes(column.id)}
                    />
                  ))}
                  
                  {/* Add Column Button */}
                  <div className="flex-shrink-0">
                    <Button
                      onClick={handleAddColumn}
                      variant="ghost"
                      className="w-80 h-32 border-2 border-dashed border-[#3A3A3C] hover:border-[#4A4A4C] bg-transparent hover:bg-[#1A1A1C]/50 text-white/60 hover:text-white/90 transition-all duration-300 rounded-lg flex flex-col items-center justify-center gap-2"
                    >
                      <Plus className="h-6 w-6" />
                      <span className="text-sm font-medium">Adicionar Coluna</span>
                    </Button>
                  </div>
                </div>
              </SortableContext>
            )}
          </div>
          
          {/* Drag Overlay for visual feedback */}
          <DragOverlay dropAnimation={null}>
            {activeColumn && (
              <div className="w-80 p-4 bg-[#1A1A1C] border-2 border-blue-500/50 rounded-lg shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="text-base">
                    {activeColumn.icon}
                  </div>
                  <span className="text-white font-bold text-base">{activeColumn.title}</span>
                  <span className="text-white/60 text-sm ml-auto">Movendo coluna...</span>
                </div>
              </div>
            )}
            {activeTask && (
              <div className="w-80 p-4 bg-[#1E1E20] border-2 border-blue-500/50 rounded-lg shadow-2xl rotate-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-blue-400 font-medium">Movendo tarefa...</span>
                </div>
                <div className="text-white font-semibold text-sm">{activeTask.title}</div>
                {activeTask.priority && (
                  <div className="mt-2">
                    <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                      Prioridade: {activeTask.priority === 'high' ? 'Alta' : activeTask.priority === 'med' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <KanbanTaskModal
          task={selectedTask}
          workspace={workspace}
          members={members}
          isOpen={isTaskModalOpen}
          onClose={handleCloseTaskModal}
        />
      )}

      {/* Task Creation Modals */}
      <TaskCreationModals
        isOpen={showTaskCreationModal}
        onClose={() => setShowTaskCreationModal(false)}
        onComplete={handleTaskCreationComplete}
        columnId={creationColumnId}
      />

      {/* Inbox Task Creation Modal */}
      <InboxTaskCreationModal
        isOpen={showInboxCreationModal}
        onClose={() => setShowInboxCreationModal(false)}
        onComplete={handleInboxTaskCreationComplete}
        columnId={creationColumnId}
      />
    </div>
  )
}