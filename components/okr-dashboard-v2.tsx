"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Circle, 
  Flag,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  Check,
  X,
  Loader2,
  GripVertical,
  CalendarDays,
  CalendarRange,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTaskData } from "./task-data"
import { useOKRData, type OKR, type KeyResult, type OKRTask } from "./okr-data-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DndContext,
  closestCenter,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  Active,
  Over,
  useDroppable
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCelebration } from "./celebration-toast"
import { Toaster } from 'sonner'
import OKRTaskDetailsModal from "./okr-task-details-modal"

// Role-based color mapping
const getRoleColor = (member: any) => {
  const role = member.role || 'editor'
  switch (role.toLowerCase()) {
    case 'admin': return 'bg-yellow-500'
    case 'editor': return 'bg-blue-500'
    case 'copywriter': return 'bg-purple-500'
    case 'gestor_trafego': return 'bg-green-500'
    case 'minerador': return 'bg-gray-500'
    default: return 'bg-blue-500'
  }
}

// Get member initials
const getMemberInitials = (member: any) => {
  if (member.name) {
    return member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }
  if (member.email) {
    return member.email[0].toUpperCase()
  }
  return 'U'
}

// Get week date range
const getWeekDateRange = (week: number, year: number) => {
  const firstDayOfYear = new Date(year, 0, 1)
  const daysOffset = (week - 1) * 7
  const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
  
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  
  return `${weekStart.getDate()}-${weekEnd.getDate()} ${months[weekStart.getMonth()]}, ${year}`
}

// Format due date with color coding (Brazil timezone)
const formatDueDate = (dueDate: string | null) => {
  if (!dueDate) return null

  // Use Brazil timezone for date calculations
  const today = new Date()
  const brazilToday = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
  brazilToday.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(dueDate + "T00:00:00")
  
  const diffTime = targetDate.getTime() - brazilToday.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  let colorClass = "text-white/70"
  if (diffDays < 0) {
    colorClass = "text-red-400" // Overdue
  } else if (diffDays === 0) {
    colorClass = "text-yellow-400" // Due today
  } else if (diffDays <= 3) {
    colorClass = "text-orange-400" // Due soon
  }
  
  return {
    formatted: targetDate.toLocaleDateString("pt-BR", { 
      day: "2-digit", 
      month: "2-digit" 
    }),
    colorClass,
    diffDays
  }
}

// Droppable Key Result Component - Trello Style
const DroppableKeyResult = React.memo(function DroppableKeyResult({ 
  kr, 
  children, 
  okrId,
  onToggleTask,
  onCreateTask,
  onDeleteKR,
  onUpdateKR,
  activeId
}: { 
  kr: KeyResult
  children: React.ReactNode
  okrId: string
  onToggleTask: (id: string) => void
  onCreateTask: (krId: string) => void
  onDeleteKR: (id: string) => void
  onUpdateKR: (id: string, updates: Partial<KeyResult>) => void
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `kr-${kr.id}`,
    data: {
      type: 'keyResult',
      keyResult: kr
    }
  })

  const isDraggingTask = activeId?.startsWith('task-')

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-200",
        isDraggingTask && isOver && "bg-blue-500/10 ring-2 ring-blue-400/50 ring-inset",
        isDraggingTask && "min-h-[200px]" // Expand drop area when dragging
      )}
    >
      {/* Drop indicator */}
      {isDraggingTask && isOver && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent rounded-lg pointer-events-none z-10">
          <div className="flex items-center justify-center h-full">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Soltar aqui
            </div>
          </div>
        </div>
      )}
      
      {/* Drag handle for reordering KRs */}
      <div className="absolute top-3 right-3 p-1.5 rounded-md cursor-grab hover:bg-white/10 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <GripVertical className="h-4 w-4 text-white/50 hover:text-white/70" />
      </div>
      
      {children}
    </div>
  )
})

// Sortable Task Component - Trello Style
const SortableTask = React.memo(function SortableTask({ 
  task, 
  children,
  isDraggingOverKR = false
}: { 
  task: OKRTask
  children: React.ReactNode
  isDraggingOverKR?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: `task-${task.id}`,
    data: {
      type: 'task',
      task: task
    },
    animateLayoutChanges: () => false
  })

  // Memoized style calculation
  const style = React.useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  }), [transform, transition, isDragging])

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative will-change-transform cursor-grab active:cursor-grabbing",
        "hover:bg-[#252527] rounded-lg transition-all duration-150",
        isDragging && "z-50 rotate-1 scale-105 shadow-2xl bg-[#3A3A3C]",
        isDraggingOverKR && "border-2 border-blue-400/50"
      )}
    >
      {/* Visual drag indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg pointer-events-none" />
      )}
      
      {children}
    </div>
  )
})

export default function OKRDashboardV2() {
  const { members } = useTaskData()
  const { 
    okrs, 
    loading, 
    currentWeek: defaultWeek,
    currentYear,
    createOKR,
    updateOKR,
    deleteOKR,
    createKeyResult,
    updateKeyResult,
    deleteKeyResult,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    updateAssignees,
    reorderKeyResults,
    moveTaskBetweenKRs,
    getOKRByWeek,
    refreshOKRs
  } = useOKRData()

  // Celebration hook
  const { celebrate } = useCelebration()

  const [currentWeek, setCurrentWeek] = useState<number>(defaultWeek)
  const [dateFilter, setDateFilter] = useState<'hoje' | 'amanha' | 'todos'>('todos')
  const [selectedTask, setSelectedTask] = useState<{krId: string, taskId: string} | null>(null)
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false)
  
  // OKR Task Details Modal states
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<OKRTask | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isOKRModalOpen, setIsOKRModalOpen] = useState(false)
  const [isKRModalOpen, setIsKRModalOpen] = useState(false)
  const [selectedOKRId, setSelectedOKRId] = useState<string | null>(null)
  const [selectedKRId, setSelectedKRId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [addingTaskToKR, setAddingTaskToKR] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  
  // Key Result title editing states
  const [editingKRId, setEditingKRId] = useState<string | null>(null)
  const [krTitleValue, setKrTitleValue] = useState("")
  
  // Task deletion confirmation states
  const [taskToDelete, setTaskToDelete] = useState<{id: string, title: string} | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  
  // Drag & Drop states
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<{type: 'kr' | 'task', item: any} | null>(null)
  const [completedTasksCount, setCompletedTasksCount] = useState(0)
  const [overId, setOverId] = useState<string | null>(null)

  // Form states for OKR
  const [okrForm, setOkrForm] = useState({
    title: '',
    focus: '',
    week: currentWeek,
    year: currentYear
  })

  // Form states for Key Result
  const [krForm, setKrForm] = useState({
    title: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  })

  // Get current OKR based on selected week
  const currentOKR = useMemo(() => {
    return getOKRByWeek(currentWeek, currentYear)
  }, [getOKRByWeek, currentWeek, currentYear])

  // Enhanced team member data with role colors
  const enhancedMembers = useMemo(() => {
    return members.map(member => ({
      ...member,
      initial: getMemberInitials(member),
      color: getRoleColor(member)
    }))
  }, [members])

  // Helper functions for date filtering (Brazil timezone)
  const getTodayDateBrazil = useCallback(() => {
    const today = new Date()
    const brazilTime = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    return brazilTime.toISOString().split('T')[0]
  }, [])

  const getTomorrowDateBrazil = useCallback(() => {
    const today = new Date()
    const brazilTime = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    brazilTime.setDate(brazilTime.getDate() + 1)
    return brazilTime.toISOString().split('T')[0]
  }, [])

  // Filter tasks by date
  const filterTasksByDate = useCallback((tasks: OKRTask[] | undefined, filter: 'hoje' | 'amanha' | 'todos') => {
    if (!tasks || filter === 'todos') return tasks
    
    const today = getTodayDateBrazil()
    const tomorrow = getTomorrowDateBrazil()
    
    return tasks.filter(task => {
      if (!task.due_date) return false
      
      if (filter === 'hoje') {
        return task.due_date === today
      } else if (filter === 'amanha') {
        return task.due_date === tomorrow
      }
      
      return false
    })
  }, [getTodayDateBrazil, getTomorrowDateBrazil])

  // Count tasks by filter type
  const taskCounts = useMemo(() => {
    if (!currentOKR?.keyResults) {
      return { hoje: 0, amanha: 0, todos: 0 }
    }

    const allTasks = currentOKR.keyResults.flatMap(kr => kr.tasks || [])
    const today = getTodayDateBrazil()
    const tomorrow = getTomorrowDateBrazil()
    
    return {
      hoje: allTasks.filter(task => task.due_date === today).length,
      amanha: allTasks.filter(task => task.due_date === tomorrow).length,
      todos: allTasks.length
    }
  }, [currentOKR, getTodayDateBrazil, getTomorrowDateBrazil])

  // Optimized Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Reduce activation distance for more responsive dragging
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!currentOKR || !currentOKR.keyResults) return 0
    const totalTasks = currentOKR.keyResults.reduce((sum, kr) => sum + (kr.tasks?.length || 0), 0)
    const completedTasks = currentOKR.keyResults.reduce(
      (sum, kr) => sum + (kr.tasks?.filter(t => t.completed).length || 0), 
      0
    )
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  }, [currentOKR])

  // Get team member by ID
  const getTeamMember = (id: string) => enhancedMembers.find(m => m.id === id)

  // Week navigation functions
  const goToPreviousWeek = () => {
    const prevWeek = currentWeek - 1
    if (prevWeek >= 1) {
      setCurrentWeek(prevWeek)
    }
  }

  const goToNextWeek = () => {
    const nextWeek = currentWeek + 1
    if (nextWeek <= 52) {
      setCurrentWeek(nextWeek)
    }
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(defaultWeek)
  }

  // Get status badge for current week
  const getWeekStatusBadge = (status: OKR["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/15 border-green-500 text-green-500">Concluída</Badge>
      case "current":
        return <Badge className="bg-blue-500/15 border-blue-500 text-blue-500">Semana Atual</Badge>
      case "planned":
        return <Badge className="bg-orange-500/15 border-orange-500 text-orange-500">Planejada</Badge>
      default:
        return null
    }
  }

  const getPriorityColor = (priority: KeyResult["priority"]) => {
    switch (priority) {
      case "high": return "bg-red-500"
      case "medium": return "bg-yellow-500"  
      case "low": return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  const getPriorityBorderColor = (priority: KeyResult["priority"]) => {
    switch (priority) {
      case "high": return "border-red-500/30"
      case "medium": return "border-yellow-500/30"  
      case "low": return "border-green-500/30"
      default: return "border-gray-500/30"
    }
  }

  const getPriorityBgColor = (priority: KeyResult["priority"]) => {
    switch (priority) {
      case "high": return "bg-red-500/10"
      case "medium": return "bg-yellow-500/10"  
      case "low": return "bg-green-500/10"
      default: return "bg-gray-500/10"
    }
  }

  // Função para gerar avatar colorido baseado no nome
  const generateAvatar = (name: string, size: string = "w-8 h-8") => {
    if (!name) return null
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
    ]
    
    const colorIndex = name.charCodeAt(0) % colors.length
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    
    return (
      <div className={`${size} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:scale-110 transition-transform`}>
        {initials}
      </div>
    )
  }

  const getPriorityLabel = (priority: KeyResult["priority"]) => {
    switch (priority) {
      case "high": return "Alta"
      case "medium": return "Média"
      case "low": return "Baixa"
      default: return ""
    }
  }

  // OKR CRUD handlers
  const handleCreateOKR = async () => {
    setSavingId('new-okr')
    const newOKR = await createOKR({
      week: okrForm.week,
      year: okrForm.year,
      title: okrForm.title,
      focus: okrForm.focus,
      status: 'planned'
    })
    setSavingId(null)
    setIsOKRModalOpen(false)
    if (newOKR) {
      setCurrentWeek(okrForm.week)
    }
  }

  const handleUpdateOKR = async (id: string, updates: Partial<OKR>) => {
    setSavingId(id)
    await updateOKR(id, updates)
    setSavingId(null)
    setIsOKRModalOpen(false)
  }

  const handleDeleteOKR = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este OKR e todos seus Key Results?')) {
      setSavingId(id)
      await deleteOKR(id)
      setSavingId(null)
    }
  }

  // Key Result CRUD handlers
  const handleCreateKR = async () => {
    if (!selectedOKRId) return
    setSavingId('new-kr')
    await createKeyResult(selectedOKRId, {
      title: krForm.title,
      target: 0, // Will be automatically updated based on tasks
      priority: krForm.priority,
      current: 0,
      position: currentOKR?.keyResults?.length || 0
    })
    setSavingId(null)
    setIsKRModalOpen(false)
    setSelectedOKRId(null)
    setKrForm({ title: '', priority: 'medium' })
  }

  const handleUpdateKR = async (id: string, updates: Partial<KeyResult>) => {
    setSavingId(id)
    await updateKeyResult(id, updates)
    setSavingId(null)
  }

  const handleDeleteKR = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este Key Result e todas suas tarefas?')) {
      setSavingId(id)
      await deleteKeyResult(id)
      setSavingId(null)
    }
  }

  // Task CRUD handlers
  const handleCreateTask = async (krId: string) => {
    if (!newTaskTitle.trim()) return
    
    // Prevent multiple clicks by checking if already processing ANY task creation
    if (savingId !== null) return
    
    // Store the title and immediately clear the form to prevent visual lag
    const taskTitle = newTaskTitle.trim()
    
    // Set saving state and immediately clear the UI
    setSavingId(`new-task-${krId}`)
    setNewTaskTitle("")
    setAddingTaskToKR(null)
    
    try {
      const result = await createTask(krId, {
        title: taskTitle,
        completed: false,
        assignee_id: members[0]?.id,
        position: 999
      })
      if (result) {

      } else {

      }
    } catch (error) {

    } finally {
      setSavingId(null)
    }
  }

  const handleUpdateTaskTitle = async (id: string) => {
    if (!editingTaskTitle.trim()) return
    setSavingId(id)
    await updateTask(id, { title: editingTaskTitle })
    setSavingId(null)
    setEditingTaskId(null)
    setEditingTaskTitle("")
  }

  // Key Result title editing handlers
  const handleStartKRTitleEditing = (kr: KeyResult) => {
    setEditingKRId(kr.id)
    setKrTitleValue(kr.title)
  }

  const handleSaveKRTitle = async () => {
    if (!editingKRId || !krTitleValue.trim()) return
    setSavingId(editingKRId)
    await updateKeyResult(editingKRId, { title: krTitleValue })
    setSavingId(null)
    setEditingKRId(null)
    setKrTitleValue("")
  }

  const handleCancelKRTitleEditing = () => {
    setEditingKRId(null)
    setKrTitleValue("")
  }

  const handleKRTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveKRTitle()
    } else if (e.key === 'Escape') {
      handleCancelKRTitleEditing()
    }
  }

  const handleDeleteTask = (id: string, title: string) => {
    setTaskToDelete({ id, title })
    setIsDeleteConfirmOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return
    setSavingId(taskToDelete.id)
    setIsDeleteConfirmOpen(false)
    try {
      await deleteTask(taskToDelete.id)
    } finally {
      setSavingId(null)
      setTaskToDelete(null)
    }
  }

  const cancelDeleteTask = () => {
    setIsDeleteConfirmOpen(false)
    setTaskToDelete(null)
  }

  const handleToggleTask = async (id: string) => {
    setSavingId(id)
    await toggleTaskComplete(id)
    setSavingId(null)
  }

  const changeTaskAssignee = async (taskId: string, newAssigneeId: string) => {
    setSavingId(taskId)
    await updateTask(taskId, { assignee_id: newAssigneeId })
    setSavingId(null)
    setIsAssigneeModalOpen(false)
    setSelectedTask(null)
  }

  const openAssigneeModal = (krId: string, taskId: string) => {
    setSelectedTask({ krId, taskId })
    setIsAssigneeModalOpen(true)
  }

  // Open task details modal
  const openTaskModal = (task: OKRTask) => {
    setSelectedTaskForDetails(task)
    setIsTaskModalOpen(true)
  }

  // Enhanced toggle task with celebration
  const handleToggleTaskWithCelebration = async (id: string) => {
    // Find the task to check its current state
    let isCompleting = false
    currentOKR?.keyResults?.forEach(kr => {
      kr.tasks?.forEach(task => {
        if (task.id === id && !task.completed) {
          isCompleting = true
        }
      })
    })

    setSavingId(id)
    await toggleTaskComplete(id)
    setSavingId(null)

    // If completing a task, trigger celebration
    if (isCompleting) {
      const newCount = completedTasksCount + 1
      setCompletedTasksCount(newCount)
      
      // Get user name from members
      const userName = members[0]?.name // You might want to get the actual logged user
      celebrate(userName, newCount)
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Determine what's being dragged
    if (active.id.toString().startsWith('kr-')) {
      const krId = active.id.toString().replace('kr-', '')
      const kr = currentOKR?.keyResults?.find(k => k.id === krId)
      if (kr) {
        setDraggedItem({ type: 'kr', item: kr })
      }
    } else if (active.id.toString().startsWith('task-')) {
      const taskId = active.id.toString().replace('task-', '')
      const task = currentOKR?.keyResults
        ?.flatMap(kr => kr.tasks || [])
        ?.find(t => t.id === taskId)
      if (task) {
        setDraggedItem({ type: 'task', item: task })
      }
    }
  }

  // Handle drag over to track which KR we're hovering
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over || !active.id.toString().startsWith('task-')) return
    
    const overId = over.id.toString()
    setOverId(overId)
    
    // Find the Key Result that contains this drop target
    let targetKRId = null
    
    if (overId.startsWith('kr-')) {
      // Direct drop on Key Result
      targetKRId = overId.replace('kr-', '')
    } else if (overId.startsWith('task-')) {
      // Drop on a task - find which KR contains this task
      const keyResults = currentOKR?.keyResults || []
      for (const kr of keyResults) {
        if (kr.tasks?.some(task => `task-${task.id}` === overId)) {
          targetKRId = kr.id
          break
        }
      }
    }
    
    // Store the target KR for visual feedback
    if (targetKRId) {
      setOverId(`kr-${targetKRId}`)
    }
  }, [currentOKR])

  // Enhanced Trello-style drag end handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDraggedItem(null)
    setOverId(null)
    
    if (!over || !currentOKR) return

    const activeId = active.id.toString()
    const overId = over.id.toString()

    // Early return if dropping on itself
    if (activeId === overId) return

    // Handle Task moving - works for both direct KR drops and task drops
    if (activeId.startsWith('task-')) {
      const taskId = activeId.replace('task-', '')
      let destinationKRId: string | null = null

      // Find destination KR
      if (overId.startsWith('kr-')) {
        // Direct drop on Key Result
        destinationKRId = overId.replace('kr-', '')
      } else if (overId.startsWith('task-')) {
        // Drop on a task - find which KR contains this task
        const keyResults = currentOKR.keyResults || []
        for (const kr of keyResults) {
          if (kr.tasks?.some(task => `task-${task.id}` === overId)) {
            destinationKRId = kr.id
            break
          }
        }
      }

      if (destinationKRId) {
        // Find source KR
        let sourceKRId: string | null = null
        const keyResults = currentOKR.keyResults || []
        
        for (const kr of keyResults) {
          if (kr.tasks?.some(task => task.id === taskId)) {
            sourceKRId = kr.id
            break
          }
        }
        
        // Move task if source and destination are different
        if (sourceKRId && sourceKRId !== destinationKRId) {
          const destinationKR = keyResults.find(kr => kr.id === destinationKRId)
          const newPosition = destinationKR?.tasks?.length || 0

          moveTaskBetweenKRs(taskId, sourceKRId, destinationKRId, newPosition)
        }
      }
      return
    }

    // Handle Key Result reordering
    if (activeId.startsWith('kr-') && overId.startsWith('kr-')) {
      const keyResults = currentOKR.keyResults
      if (!keyResults) return
      
      const oldIndex = keyResults.findIndex(kr => `kr-${kr.id}` === activeId)
      const newIndex = keyResults.findIndex(kr => `kr-${kr.id}` === overId)
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderKeyResults(currentOKR.id, oldIndex, newIndex)
      }
    }
  }, [currentOKR, reorderKeyResults, moveTaskBetweenKRs])

  // Show loading if data is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#FFD60A] mx-auto mb-4" />
          <p className="text-white/70">Carregando OKRs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              disabled={currentWeek <= 1}
              className="border-[#3A3A3C] hover:bg-[#3A3A3C]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select value={currentWeek.toString()} onValueChange={(value) => setCurrentWeek(parseInt(value))}>
              <SelectTrigger className="w-[200px] bg-[#2C2C2E] border-[#3A3A3C]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    Semana {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              disabled={currentWeek >= 52}
              className="border-[#3A3A3C] hover:bg-[#3A3A3C]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {currentWeek !== defaultWeek && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                className="border-[#3A3A3C] hover:bg-[#3A3A3C] text-[#FFD60A] border-[#FFD60A]"
              >
                <Clock className="h-4 w-4 mr-2" />
                Ir para Semana Atual
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentOKR && getWeekStatusBadge(currentOKR.status)}
            <Button
              onClick={() => {
                setOkrForm({
                  title: '',
                  focus: '',
                  week: currentWeek,
                  year: currentYear
                })
                setIsOKRModalOpen(true)
              }}
              className="bg-[#FFD60A] text-black hover:bg-[#ffd60a]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo OKR
            </Button>
          </div>
        </div>

        {currentOKR ? (
          <>
            {/* Header Informativo Melhorado */}
            <div className="bg-gradient-to-r from-[#2C2C2E] to-[#3A3A3C] rounded-2xl p-6 mb-8 border border-[#4A4A4C]">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Título e Período */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#FFD60A]/10 rounded-lg">
                      <Target className="h-6 w-6 text-[#FFD60A]" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-white">
                        {currentOKR?.title || 'OKR Operacional'}
                      </h1>
                      <div className="flex items-center gap-2 text-white/60 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Semana {currentWeek} • {getWeekDateRange(currentWeek, currentYear)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Foco da Semana */}
                  {currentOKR.focus && (
                    <div className="bg-[#1A1A1A]/50 rounded-lg p-4 border-l-4 border-[#FFD60A]">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag className="h-4 w-4 text-[#FFD60A]" />
                        <span className="text-sm font-medium text-[#FFD60A]">Foco da Semana</span>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">{currentOKR.focus}</p>
                    </div>
                  )}
                </div>

                {/* Progresso Geral - Redesign */}
                <div className="flex flex-col items-center lg:items-end gap-4">
                  <div className="text-center lg:text-right">
                    <div className="text-white/60 text-sm mb-1">Progresso Geral</div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-[#30D158] to-[#34D65A] bg-clip-text text-transparent">
                      {overallProgress}%
                    </div>
                  </div>
                  
                  {/* Progress Ring */}
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#3A3A3C]"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#30D158]"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={`${overallProgress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-[#30D158]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-white/70 mb-4">Nenhum OKR criado para a semana {currentWeek}</p>
            <Button
              onClick={() => {
                setOkrForm({
                  title: '',
                  focus: '',
                  week: currentWeek,
                  year: currentYear
                })
                setIsOKRModalOpen(true)
              }}
              className="bg-[#FFD60A] text-black hover:bg-[#ffd60a]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar OKR para esta semana
            </Button>
          </div>
        )}
      </div>

      {/* Key Results Grid */}
      {currentOKR && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Key Results</h2>
            <div className="flex items-center gap-3">
              {/* Filter buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setDateFilter('hoje')}
                  variant={dateFilter === 'hoje' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "h-8 text-xs flex items-center gap-1.5",
                    dateFilter === 'hoje'
                      ? "bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90"
                      : "border-[#3A3A3C] text-white/80 hover:bg-white/10"
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Hoje</span>
                  {taskCounts.hoje > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] bg-white/20 text-white">
                      {taskCounts.hoje}
                    </Badge>
                  )}
                </Button>
                <Button
                  onClick={() => setDateFilter('amanha')}
                  variant={dateFilter === 'amanha' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "h-8 text-xs flex items-center gap-1.5",
                    dateFilter === 'amanha'
                      ? "bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90"
                      : "border-[#3A3A3C] text-white/80 hover:bg-white/10"
                  )}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span>Amanhã</span>
                  {taskCounts.amanha > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] bg-white/20 text-white">
                      {taskCounts.amanha}
                    </Badge>
                  )}
                </Button>
                <Button
                  onClick={() => setDateFilter('todos')}
                  variant={dateFilter === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "h-8 text-xs flex items-center gap-1.5",
                    dateFilter === 'todos'
                      ? "bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90"
                      : "border-[#3A3A3C] text-white/80 hover:bg-white/10"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Todos</span>
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] bg-white/20 text-white">
                    {taskCounts.todos}
                  </Badge>
                </Button>
              </div>
              
              <Button
                onClick={() => {
                  setSelectedOKRId(currentOKR.id)
                  setIsKRModalOpen(true)
                }}
                variant="outline"
                className="border-[#3A3A3C] hover:bg-[#3A3A3C]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Key Result
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            // Performance optimizations for Trello-style
            autoScroll={true}
            measuring={{
              droppable: {
                strategy: 'whenDragging'
              }
            }}
          >
            <SortableContext
              items={currentOKR.keyResults?.map(kr => `kr-${kr.id}`) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {currentOKR.keyResults?.map((kr) => {
              // Apply date filter to tasks
              const filteredTasks = filterTasksByDate(kr.tasks, dateFilter)
              const completedTasks = filteredTasks?.filter(t => t.completed).length || 0
              const progress = filteredTasks?.length ? Math.round((completedTasks / filteredTasks.length) * 100) : 0
              
              return (
                <DroppableKeyResult
                  key={kr.id}
                  kr={kr}
                  okrId={currentOKR.id}
                  onToggleTask={handleToggleTaskWithCelebration}
                  onCreateTask={() => setAddingTaskToKR(kr.id)}
                  onDeleteKR={handleDeleteKR}
                  onUpdateKR={handleUpdateKR}
                  activeId={activeId}
                >
                  <Card className={cn(
                    "bg-gradient-to-br from-[#2C2C2E] to-[#3A3A3C] border-2 transition-all duration-300 group transform-gpu hover:scale-[1.02] hover:shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4",
                    getPriorityBorderColor(kr.priority),
                    getPriorityBgColor(kr.priority)
                  )}>
                  <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {editingKRId === kr.id ? (
                          <Input
                            value={krTitleValue}
                            onChange={(e) => setKrTitleValue(e.target.value)}
                            onBlur={handleSaveKRTitle}
                            onKeyDown={handleKRTitleKeyDown}
                            className="text-lg font-semibold text-white mb-2 leading-tight bg-transparent border-[#FFD60A] focus:border-[#FFD60A] placeholder-white/40"
                            autoFocus
                          />
                        ) : (
                          <CardTitle 
                            className="text-base sm:text-lg font-semibold text-white mb-2 leading-tight cursor-pointer hover:text-[#FFD60A] transition-colors"
                            onClick={() => handleStartKRTitleEditing(kr)}
                          >
                            {kr.title}
                          </CardTitle>
                        )}
                        <div className="flex items-center gap-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:outline-none">
                              <Badge 
                                className={cn(
                                  "text-white text-xs px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity",
                                  getPriorityColor(kr.priority)
                                )}
                              >
                                {getPriorityLabel(kr.priority)}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem 
                                onClick={() => updateKeyResult(kr.id, { priority: 'high' })}
                                className={kr.priority === 'high' ? 'bg-white/10' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500" />
                                  Alta
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateKeyResult(kr.id, { priority: 'medium' })}
                                className={kr.priority === 'medium' ? 'bg-white/10' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                  Média
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateKeyResult(kr.id, { priority: 'low' })}
                                className={kr.priority === 'low' ? 'bg-white/10' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-green-500" />
                                  Baixa
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <div className="text-xl sm:text-2xl font-bold text-[#FFD60A]">
                            {completedTasks}/{filteredTasks?.length || 0}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDeleteKR(kr.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Key Result
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                  </CardHeader>

                  <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
                    {/* Tasks */}
                    <div className="space-y-2 sm:space-y-3">
                      {/* Barra de Progresso Chamativa */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-white/60">
                            <BarChart3 className="h-4 w-4" />
                            <span>Progresso</span>
                          </div>
                          <div className="text-sm font-bold text-white">
                            {progress}%
                          </div>
                        </div>
                        <div className="relative h-3 bg-[#1A1A1A] rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500 ease-out",
                              progress === 100 ? "bg-gradient-to-r from-green-500 to-green-400" : 
                              progress >= 70 ? "bg-gradient-to-r from-blue-500 to-blue-400" :
                              progress >= 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" : 
                              "bg-gradient-to-r from-gray-500 to-gray-400"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                          {progress > 0 && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <span>Tarefas ({completedTasks}/{filteredTasks?.length || 0})
                            {dateFilter !== 'todos' && kr.tasks && filteredTasks && kr.tasks.length !== filteredTasks.length && (
                              <span className="text-white/40 ml-1">
                                (de {kr.tasks.length} total)
                              </span>
                            )}
                          </span>
                        </div>
                        <Button
                          onClick={() => setAddingTaskToKR(kr.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs hover:bg-white/10"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                      
                      {/* Add new task input */}
                      {addingTaskToKR === kr.id && (
                        <div className="flex gap-2 p-3 rounded-lg bg-[#1A1A1A]">
                          <Input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Nova tarefa..."
                            className="flex-1 bg-transparent border-[#3A3A3C]"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateTask(kr.id)
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            onClick={() => handleCreateTask(kr.id)}
                            size="sm"
                            disabled={!newTaskTitle.trim() || savingId === `new-task-${kr.id}`}
                          >
                            {savingId === `new-task-${kr.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setAddingTaskToKR(null)
                              setNewTaskTitle("")
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      <SortableContext
                        items={filteredTasks?.map(task => `task-${task.id}`) || []}
                        strategy={verticalListSortingStrategy}
                      >
                        {filteredTasks && filteredTasks.length === 0 && dateFilter !== 'todos' ? (
                          <div className="text-center py-6 text-white/50">
                            <CalendarDays className="h-8 w-8 mx-auto mb-2 text-white/30" />
                            <p className="text-sm">Nenhuma tarefa para {dateFilter === 'hoje' ? 'hoje' : 'amanhã'}</p>
                          </div>
                        ) : (
                          filteredTasks?.map((task) => {
                            const assignee = getTeamMember(task.assignee_id)
                            return (
                            <SortableTask key={task.id} task={task}>
                              <div className={cn(
                                "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 group/task mb-2 shadow-sm",
                                task.completed 
                                  ? "bg-green-500/10 border-green-500/30 hover:border-green-500/50" 
                                  : "bg-[#1A1A1A]/40 border-[#3A3A3C] hover:bg-[#1A1A1A]/70 hover:border-[#FFD60A]/30 hover:shadow-md"
                              )}
                              >
                            <button
                              onClick={() => handleToggleTaskWithCelebration(task.id)}
                              disabled={savingId === task.id}
                              className="flex-shrink-0 group/checkbox hover:scale-110 transition-transform"
                            >
                              {savingId === task.id ? (
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-white/40" />
                              ) : task.completed ? (
                                <div className="relative">
                                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-[#30D158] drop-shadow-lg" />
                                  <div className="absolute inset-0 bg-[#30D158] rounded-full opacity-20 animate-ping" />
                                </div>
                              ) : (
                                <div className="relative">
                                  <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-white/40 group-hover/checkbox:text-[#30D158] transition-colors" />
                                  <div className="absolute inset-0 border-2 border-transparent group-hover/checkbox:border-[#30D158]/30 rounded-full transition-colors" />
                                </div>
                              )}
                            </button>
                            
                            {editingTaskId === task.id ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  value={editingTaskTitle}
                                  onChange={(e) => setEditingTaskTitle(e.target.value)}
                                  className="flex-1 h-7 bg-transparent border-[#3A3A3C]"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateTaskTitle(task.id)
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  onClick={() => handleUpdateTaskTitle(task.id)}
                                  size="sm"
                                  className="h-7"
                                  disabled={savingId === task.id}
                                >
                                  {savingId === task.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingTaskId(null)
                                    setEditingTaskTitle("")
                                  }}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div 
                                  className={cn(
                                    "flex-1 text-xs sm:text-sm transition-colors cursor-pointer hover:text-[#FFD60A]",
                                    task.completed 
                                      ? "text-white/60 line-through" 
                                      : "text-white/90"
                                  )}
                                  onClick={() => openTaskModal(task)}
                                  title="Clique para ver detalhes"
                                >
                                  <div>{task.title}</div>
                                  {task.due_date && (() => {
                                    const dueDateInfo = formatDueDate(task.due_date)
                                    return dueDateInfo ? (
                                      <div className={cn(
                                        "flex items-center gap-1 mt-1 text-[10px]",
                                        dueDateInfo.colorClass
                                      )}>
                                        <CalendarDays className="h-3 w-3" />
                                        <span>{dueDateInfo.formatted}</span>
                                        {dueDateInfo.diffDays < 0 && (
                                          <span className="text-red-300">
                                            (atrasado)
                                          </span>
                                        )}
                                        {dueDateInfo.diffDays === 0 && (
                                          <span className="text-yellow-300">
                                            (hoje)
                                          </span>
                                        )}
                                      </div>
                                    ) : null
                                  })()}
                                </div>
                                
                                <button
                                  onClick={() => openAssigneeModal(kr.id, task.id)}
                                  className="flex-shrink-0"
                                  title={`Responsável: ${assignee?.name || 'Não atribuído'} - Clique para alterar`}
                                >
                                  {assignee?.name ? 
                                    generateAvatar(assignee.name, "w-7 h-7") :
                                    <div className="w-7 h-7 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:scale-110 transition-transform">
                                      ?
                                    </div>
                                  }
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteTask(task.id, task.title)}
                                  className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={savingId === task.id}
                                >
                                  {savingId === task.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-white/40" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 text-white/40 hover:text-red-400" />
                                  )}
                                </button>
                              </>
                            )}
                              </div>
                            </SortableTask>
                            )
                          }) || null
                        )}
                      </SortableContext>
                    </div>
                  </CardContent>
                </Card>
              </DroppableKeyResult>
              )
            })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Assignee Change Modal */}
      <Dialog open={isAssigneeModalOpen} onOpenChange={setIsAssigneeModalOpen}>
        <DialogContent className="bg-[#2C2C2E] border-[#3A3A3C] text-white" aria-describedby="assignee-dialog-description">
          <DialogHeader>
            <DialogTitle>Trocar Responsável</DialogTitle>
          </DialogHeader>
          <p id="assignee-dialog-description" className="sr-only">Selecione um novo responsável para esta tarefa</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {enhancedMembers.map((member) => (
              <Button
                key={member.id}
                variant="outline"
                className="justify-start gap-3 h-12 bg-[#1A1A1A] border-[#3A3A3C] hover:bg-[#3A3A3C] hover:border-[#4A4A4C]"
                onClick={() => {
                  if (selectedTask) {
                    changeTaskAssignee(selectedTask.taskId, member.id)
                  }
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className={cn("text-white font-semibold", member.color)}>
                    {member.initial}
                  </AvatarFallback>
                </Avatar>
                <span>{member.name || member.email}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* OKR Form Modal */}
      <Dialog open={isOKRModalOpen} onOpenChange={setIsOKRModalOpen}>
        <DialogContent className="bg-[#2C2C2E] border-[#3A3A3C] text-white" aria-describedby="okr-dialog-description">
          <DialogHeader>
            <DialogTitle>{currentOKR ? 'Editar' : 'Criar'} OKR</DialogTitle>
          </DialogHeader>
          <p id="okr-dialog-description" className="sr-only">Formulário para {currentOKR ? 'editar' : 'criar'} um OKR</p>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="okr-title">Título</Label>
              <Input
                id="okr-title"
                value={okrForm.title}
                onChange={(e) => setOkrForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Acelerar testes e otimizar funis"
                className="bg-[#1A1A1A] border-[#3A3A3C]"
              />
            </div>
            <div>
              <Label htmlFor="okr-focus">Foco</Label>
              <Textarea
                id="okr-focus"
                value={okrForm.focus}
                onChange={(e) => setOkrForm(prev => ({ ...prev, focus: e.target.value }))}
                placeholder="Ex: Volume de testes + Qualidade dos leads"
                className="bg-[#1A1A1A] border-[#3A3A3C]"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsOKRModalOpen(false)}
              className="border-[#3A3A3C]"
            >
              Cancelar
            </Button>
            <Button
              onClick={currentOKR ? () => handleUpdateOKR(currentOKR.id, okrForm) : handleCreateOKR}
              disabled={!okrForm.title || savingId === 'new-okr' || savingId === currentOKR?.id}
              className="bg-[#FFD60A] text-black hover:bg-[#ffd60a]/90"
            >
              {savingId === 'new-okr' || savingId === currentOKR?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {currentOKR ? 'Atualizar' : 'Criar'} OKR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Result Form Modal */}
      <Dialog open={isKRModalOpen} onOpenChange={setIsKRModalOpen}>
        <DialogContent className="bg-[#2C2C2E] border-[#3A3A3C] text-white" aria-describedby="kr-dialog-description">
          <DialogHeader>
            <DialogTitle>Adicionar Key Result</DialogTitle>
          </DialogHeader>
          <p id="kr-dialog-description" className="sr-only">Formulário para adicionar um novo Key Result ao OKR</p>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="kr-title">Título</Label>
              <Input
                id="kr-title"
                value={krForm.title}
                onChange={(e) => setKrForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Testar 42 criativos na semana"
                className="bg-[#1A1A1A] border-[#3A3A3C]"
              />
            </div>
            <div>
              <Label htmlFor="kr-priority">Prioridade</Label>
              <Select 
                value={krForm.priority} 
                onValueChange={(value) => setKrForm(prev => ({ ...prev, priority: value as 'high' | 'medium' | 'low' }))}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-[#3A3A3C]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsKRModalOpen(false)
                setSelectedOKRId(null)
              }}
              className="border-[#3A3A3C]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateKR}
              disabled={!krForm.title || savingId === 'new-kr'}
              className="bg-[#FFD60A] text-black hover:bg-[#ffd60a]/90"
            >
              {savingId === 'new-kr' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Criar Key Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* OKR Task Details Modal */}
      <OKRTaskDetailsModal
        task={selectedTaskForDetails}
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        onTaskUpdate={async () => {
          // Refresh OKR data after task update
          await refreshOKRs()
        }}
      />
      
      {/* Delete Task Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1C1C1E] border-[#3A3A3C]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-white/80 mb-2">
              Tem certeza que deseja excluir a tarefa:
            </p>
            <p className="text-white font-semibold bg-[#2C2C2E] p-3 rounded border border-[#3A3A3C]">
              "{taskToDelete?.title}"
            </p>
            <p className="text-white/60 text-sm mt-3">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              onClick={cancelDeleteTask}
              variant="outline"
              className="border-[#3A3A3C] text-white hover:bg-[#2C2C2E]"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDeleteTask}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={savingId === taskToDelete?.id}
            >
              {savingId === taskToDelete?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Toast notifications for celebrations */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#2C2C2E',
            border: '1px solid #3A3A3C',
            color: 'white'
          }
        }}
      />
    </div>
  )
}