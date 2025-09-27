"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  Calendar as CalendarIcon,
  Clock,
  User,
  Flag,
  CheckSquare,
  Plus,
  X,
  Edit3,
  Save,
  MessageCircle,
  Paperclip,
  Upload,
  Download,
  Trash2,
  MoreVertical,
  Send,
  Loader2,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTaskData } from "./task-data"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Workspace } from "@/app/tarefas/page"
import { InlineTimer } from "./inline-timer"
import TaskComments from './task-comments'
import { getTotalTimeForTask, formatTime } from "@/lib/timer-utils"
interface KanbanTaskModalProps {
  task: any
  workspace: Workspace
  members: any[]
  isOpen: boolean
  onClose: () => void
}

const priorityColors = {
  low: "bg-blue-100 text-blue-700 border-blue-200",
  med: "bg-yellow-100 text-yellow-700 border-yellow-200", 
  high: "bg-red-100 text-red-700 border-red-200",
  null: "bg-gray-100 text-gray-600 border-gray-200"
}

const priorityLabels = {
  low: "Baixa",
  med: "Média",
  high: "Alta",
  null: "Sem prioridade"
}

const statusOptions = [
  { value: "todo", label: "A Fazer", color: "bg-gray-100 text-gray-700" },
  { value: "in-progress", label: "Em Progresso", color: "bg-blue-100 text-blue-700" },
  { value: "review", label: "Revisão", color: "bg-yellow-100 text-yellow-700" },
  { value: "done", label: "Concluído", color: "bg-green-100 text-green-700" }
]

export default function KanbanTaskModal({ task, workspace, members, isOpen, onClose }: KanbanTaskModalProps) {
  const { updateTask, addComment, deleteComment, tasks, userId } = useTaskData()
  
  // Get the current task from live data to ensure comments are up to date
  const liveTask = tasks.find(t => t.id === task.id)
  const currentTask = liveTask || task
  
  // Make sure comments is always an array
  if (currentTask && !currentTask.comments) {
    currentTask.comments = []
  }
  
  // Debug: Log task data and sync comments
  useEffect(() => {
    if (isOpen) {

      if (currentTask.comments && currentTask.comments.length > 0) {

      }
    }
  }, [isOpen, currentTask.comments])
  
  // Sync local comments with current task comments
  useEffect(() => {
    if (isOpen) {
      // Reset comments when modal opens to prevent duplicates
      if (currentTask.comments) {
        setLocalComments([...currentTask.comments])
      } else {
        setLocalComments([])
      }
    } else {
      // Clear comments when modal closes
      setLocalComments([])
    }
  }, [currentTask.comments, currentTask.id, isOpen])
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(task.title || "")
  const [newComment, setNewComment] = useState("")
  const [checklist, setChecklist] = useState<any[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [localComments, setLocalComments] = useState<any[]>([])
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [isEditingAssignees, setIsEditingAssignees] = useState(false)
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [localDueDate, setLocalDueDate] = useState(task.due_date || "")
  const titleInputRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [totalTime, setTotalTime] = useState(0)
  const [timeSessions, setTimeSessions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'comments' | 'details'>('comments')
  const [editingTitle, setEditingTitle] = useState("")
  const [editingDueDate, setEditingDueDate] = useState("")
  const [editingPriority, setEditingPriority] = useState("")
  const [isEditingTaskDetails, setIsEditingTaskDetails] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Check if task is in progress
  const isInProgress = currentTask.kanban_column === 'in-progress'
  
  // Load time data
  useEffect(() => {
    const loadTimeData = async () => {
      const result = await getTotalTimeForTask(currentTask.id)
      setTotalTime(result.totalSeconds)
      // Sort sessions by start_time descending (newest first) for display
      const sortedSessions = result.sessions.sort((a, b) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      )
      setTimeSessions(sortedSessions)
    }
    
    if (currentTask.id && !currentTask.id.toString().startsWith('temp-')) {
      loadTimeData()
      
      // Refresh timer data every 30 seconds when modal is open
      const interval = setInterval(loadTimeData, 30000)
      
      return () => clearInterval(interval)
    }
  }, [currentTask.id, isOpen])
  
  // Função para scroll automático para o último comentário
  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Parse task data
  useEffect(() => {
    if (task) {
      setTitle(task.title || "")
      
      let taskData: any = {}
      try {
        taskData = task.description ? JSON.parse(task.description) : {}
      } catch {
        taskData = {}
      }
      
      setChecklist(taskData.checklist || [])
    }
  }, [task])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const assignee = currentTask.assignee_id 
    ? members.find(m => m.id === currentTask.assignee_id)
    : null

  const handleSaveTitle = async () => {
    if (title.trim() !== task.title) {
      await updateTask(task.id, { title: title.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    await updateTask(currentTask.id, { status: newStatus })
  }

  const handlePriorityChange = async (newPriority: string) => {

    await updateTask(currentTask.id, { priority: newPriority || null })
  }

  const handleAssigneeChange = async (newAssigneeId: string | null) => {
    await updateTask(currentTask.id, { assignee_id: newAssigneeId })
  }

  // Initialize assignees when modal opens
  useEffect(() => {
    if (isOpen) {
      let taskData: any = {}
      try {
        taskData = currentTask.description ? JSON.parse(currentTask.description) : {}
      } catch {
        taskData = {}
      }
      
      const currentAssigneeIds = taskData.assignees || (currentTask.assignee_id ? [currentTask.assignee_id] : [])
      setSelectedAssigneeIds(currentAssigneeIds)
    }
  }, [isOpen, currentTask])

  const handleSaveAssignees = async () => {
    let taskData: any = {}
    try {
      taskData = currentTask.description ? JSON.parse(currentTask.description) : {}
    } catch {
      taskData = {}
    }
    
    taskData.assignees = selectedAssigneeIds
    await updateTask(currentTask.id, { description: JSON.stringify(taskData) })
    setIsEditingAssignees(false)
  }

  const toggleAssignee = (memberId: string) => {
    setSelectedAssigneeIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleDueDateChange = async (newDueDate: string) => {

    // Update local state immediately for UI responsiveness
    setLocalDueDate(newDueDate)

    try {
      // Update task in database

      await updateTask(task.id, { due_date: newDueDate })

    } catch (error) {

      // Revert local state on error
      setLocalDueDate(task.due_date || "")

    }
  }

  const handleSaveTaskDetails = async () => {
    setIsSaving(true)
    try {
      const updates: any = {}
      
      if (editingTitle.trim() !== currentTask.title) {
        updates.title = editingTitle.trim()
      }
      
      if (editingDueDate !== (currentTask.due_date || "")) {
        updates.due_date = editingDueDate || null
      }
      
      if (editingPriority !== (currentTask.priority || "")) {
        updates.priority = editingPriority || null
      }
      
      if (Object.keys(updates).length > 0) {
        await updateTask(currentTask.id, updates)
      }
      
      setIsEditingTaskDetails(false)
    } catch (error) {
      console.error('Error saving task details:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to safely update task data in description field
  const updateTaskDescription = (updates: any) => {
    // Get current task from context to ensure we have latest data
    const currentTaskData = liveTask || task
    
    let taskData: any = {}
    try {
      // Parse existing data, preserving all fields
      taskData = currentTaskData.description ? JSON.parse(currentTaskData.description) : {}
    } catch {
      taskData = {}
    }
    
    // Merge updates with existing data
    const updatedData = { ...taskData, ...updates }
    
    // Save to database
    updateTask(currentTaskData.id, { description: JSON.stringify(updatedData) })
  }

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem = {
        id: Date.now().toString(),
        text: newChecklistItem.trim(),
        completed: false
      }
      const updatedChecklist = [...checklist, newItem]
      setChecklist(updatedChecklist)
      setNewChecklistItem("")
      
      // Auto-save checklist preserving other data
      updateTaskDescription({ checklist: updatedChecklist })
    }
  }

  const toggleChecklistItem = (itemId: string) => {
    const updatedChecklist = checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    setChecklist(updatedChecklist)
    
    // Auto-save checklist preserving other data
    updateTaskDescription({ checklist: updatedChecklist })
  }

  const removeChecklistItem = (itemId: string) => {
    const updatedChecklist = checklist.filter(item => item.id !== itemId)
    setChecklist(updatedChecklist)
    
    // Auto-save checklist preserving other data
    updateTaskDescription({ checklist: updatedChecklist })
  }

  const handleImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {

      return null
    }

    setUploadingImage(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Ensure we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {

        return null
      }
      
      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const ext = file.name.split('.').pop()
      const fileName = `${currentTask.id}_${timestamp}_${randomString}.${ext}`
      const filePath = `comments/${fileName}`

      // Always use the API endpoint which handles auth properly

      const signRes = await fetch(`/api/tasks/${currentTask.id}/files/sign-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          fileName: file.name || 'image.png', 
          size: file.size, 
          contentType: file.type || 'image/png'
        }),
      })
      
      const signData = await signRes.json()
      
      if (!signRes.ok || !signData?.token || !signData?.path) {

        return null
      }
      
      // Upload using the signed URL - USANDO FETCH DIRETO

      // Se temos a URL assinada completa, usar ela
      const uploadUrl = signData.signedUrl || `${session.supabaseUrl}/storage/v1/object/upload/sign/${signData.path}?token=${signData.token}`
      
      // Upload direto usando fetch (evita bugs do client Supabase)
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file, // Envia APENAS o arquivo binário
        headers: {
          'Content-Type': file.type || 'image/png'
        }
      })
      
      if (!uploadResponse.ok) {

        const errorText = await uploadResponse.text()

        return null
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-files')
        .getPublicUrl(signData.path)

      // Verificar se a imagem é acessível
      try {
        const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' })

      } catch (testError) {

      }
      
      return urlData.publicUrl
    } catch (error) {

      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const imageUrl = await handleImageUpload(file)
    if (imageUrl) {
      // Add image as a comment directly
      const imageComment = `![image](${imageUrl})`
      
      // Send as a comment immediately
      setIsSubmittingComment(true)
      const currentUser = members.find(m => m.id === userId)
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        content: imageComment,
        created_at: new Date().toISOString(),
        user_id: userId || '',
        user: currentUser || {
          id: userId,
          name: 'Usuário',
          email: 'user@example.com',
          avatar_url: null
        }
      }
      
      setLocalComments(prev => [...prev, optimisticComment])
      scrollToBottom()
      
      try {
        await addComment(currentTask.id, imageComment)
      } catch (error) {

        setLocalComments(prev => prev.filter(c => c.id !== optimisticComment.id))
      } finally {
        setIsSubmittingComment(false)
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddComment = async () => {

    if (newComment.trim() && !isSubmittingComment) {
      setIsSubmittingComment(true)
      
      // Optimistic update - add comment immediately to UI
      const currentUser = members.find(m => m.id === userId)
      try {
        await addComment(currentTask.id, newComment.trim())
        setNewComment("")
        
        // Scroll para o novo comentário quando chegar
        setTimeout(scrollToBottom, 200)
        
      } catch (error) {
        console.error('Erro ao adicionar comentário:', error)
      } finally {
        setIsSubmittingComment(false)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR')
  }

  // Agrupar sessões por usuário e calcular tempo total
  const getUserSessionsSummary = (sessions: any[]) => {
    const userSessions: { [userId: string]: { user: any, totalTime: number, sessions: any[] } } = {}
    
    sessions.filter(s => s.end_time).forEach(session => {
      if (!session.user) return
      
      const userId = session.user.id
      if (!userSessions[userId]) {
        userSessions[userId] = {
          user: session.user,
          totalTime: 0,
          sessions: []
        }
      }
      
      userSessions[userId].sessions.push(session)
      userSessions[userId].totalTime += session.duration_seconds || 0
    })
    
    // Converter para array e ordenar por tempo total decrescente
    return Object.values(userSessions).sort((a, b) => b.totalTime - a.totalTime)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = task.due_date ? new Date(task.due_date + 'T00:00:00') : null
  const isOverdue = dueDate && dueDate < today
  const isDueToday = dueDate && dueDate.getTime() === today.getTime()
  const completedChecklistItems = checklist.filter(item => item.completed).length
  const checklistProgress = checklist.length > 0 ? (completedChecklistItems / checklist.length) * 100 : 0

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[98vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[90vw] h-[95vh] bg-[#1C1C1E] text-[#F2F2F7] border-0 rounded-lg p-0 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col" 
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-[#2E2E30]">
          <DialogHeader>
            <DialogTitle className="text-[#F2F2F7] flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5 text-white/70" />
              Detalhes da Tarefa
            </DialogTitle>
            <DialogDescription className="text-white/65 text-sm">
              Gerencie sua tarefa e acompanhe comentários e checklist.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 px-2 pt-2">
          <div className="flex bg-[#2A2A2C] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('comments')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                activeTab === 'comments'
                  ? "bg-[#3A3A3C] text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-[#3A3A3C]"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Comentários
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                activeTab === 'details'
                  ? "bg-[#3A3A3C] text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-[#3A3A3C]"
              )}
            >
              <CheckSquare className="h-4 w-4" />
              Detalhes
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'comments' ? (
            /* Comments Tab */
            <div className="h-full flex flex-col">
              <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg mx-2 mt-2 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-3 min-h-0">
                  <TaskComments taskId={task.id} />
                </div>
              </div>
            </div>
          ) : (
            /* Details Tab */
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-[#1E1E20] scrollbar-thumb-[#3A3A3C] hover:scrollbar-thumb-[#4A4A4C]">
              <div className="px-2 py-2">

                  {/* Task Title and Basic Info - Large */}
                  <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="h-5 w-5 text-[#7C8CF8]" />
                      <label className="text-base font-semibold text-white/95">Detalhes da Tarefa</label>
                    </div>
                    
                    {isEditingTaskDetails ? (
                      <div className="space-y-4">
                        {/* Title Input */}
                        <div>
                          <label className="text-sm text-white/70 mb-2 block">Título</label>
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full bg-[#2A2A2C] border border-[#3A3A3C] text-white rounded-md px-3 py-2 text-lg font-medium"
                            placeholder="Título da tarefa"
                          />
                        </div>
                        
                        {/* Due Date Input */}
                        <div>
                          <label className="text-sm text-white/70 mb-2 block">Data de Entrega</label>
                          <div className="space-y-2">
                            <input
                              type="date"
                              value={editingDueDate}
                              onChange={(e) => setEditingDueDate(e.target.value)}
                              className="w-full bg-[#2A2A2C] border border-[#3A3A3C] text-white rounded-md px-3 py-2"
                            />
                            {/* Date Shortcuts */}
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date()
                                  const brazilToday = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
                                  const todayStr = brazilToday.toISOString().split('T')[0]
                                  setEditingDueDate(todayStr)
                                }}
                                className="h-7 px-2 text-xs bg-[#2A2A2C] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
                              >
                                Hoje
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date()
                                  const brazilToday = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
                                  const tomorrow = new Date(brazilToday.getFullYear(), brazilToday.getMonth(), brazilToday.getDate() + 1)
                                  const tomorrowStr = tomorrow.toISOString().split('T')[0]
                                  setEditingDueDate(tomorrowStr)
                                }}
                                className="h-7 px-2 text-xs bg-[#2A2A2C] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
                              >
                                Amanhã
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date()
                                  const brazilToday = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
                                  const dayAfterTomorrow = new Date(brazilToday.getFullYear(), brazilToday.getMonth(), brazilToday.getDate() + 2)
                                  const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0]
                                  setEditingDueDate(dayAfterTomorrowStr)
                                }}
                                className="h-7 px-2 text-xs bg-[#2A2A2C] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
                              >
                                Depois de amanhã
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Priority Input */}
                        <div>
                          <label className="text-sm text-white/70 mb-2 block">Prioridade</label>
                          <select
                            value={editingPriority}
                            onChange={(e) => setEditingPriority(e.target.value)}
                            className="w-full bg-[#2A2A2C] border border-[#3A3A3C] text-white rounded-md px-3 py-2"
                          >
                            <option value="">Sem prioridade</option>
                            <option value="low">Baixa</option>
                            <option value="med">Média</option>
                            <option value="high">Alta</option>
                          </select>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={handleSaveTaskDetails}
                            disabled={isSaving}
                            className="bg-blue-600 text-white hover:bg-blue-700 rounded-md px-4 py-2"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              "Salvar"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIsEditingTaskDetails(false)
                              setEditingTitle(currentTask.title)
                              setEditingDueDate(currentTask.due_date || "")
                              setEditingPriority(currentTask.priority || "")
                            }}
                            className="text-white/80 hover:bg-white/10"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-[#2A2A2C] rounded-md p-3 -m-3 transition-colors"
                        onClick={() => {
                          setIsEditingTaskDetails(true)
                          setEditingTitle(currentTask.title)
                          setEditingDueDate(currentTask.due_date || "")
                          setEditingPriority(currentTask.priority || "")
                        }}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xl font-medium text-white/90 leading-relaxed mb-1">
                              {currentTask.title}
                            </p>
                          </div>
                          
                          {currentTask.due_date && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-[#FF9500]" />
                              <span className="text-sm text-white/70">
                                Prazo: {format(new Date(currentTask.due_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              {isOverdue && (
                                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">Vencido</span>
                              )}
                              {isDueToday && (
                                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Hoje</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-white/70" />
                            <span className="text-sm text-white/70">
                              Prioridade: 
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", priorityColors[(currentTask.priority || 'null') as keyof typeof priorityColors])}
                            >
                              {priorityLabels[(currentTask.priority || 'null') as keyof typeof priorityLabels]}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <Edit3 className="h-3 w-3" />
                            <span>Clique para editar</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Timer Section - Detailed */}
                  <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-blue-400" />
                      <h3 className="text-base font-semibold text-white/95">Tempo Gasto</h3>
                    </div>
                    
                    {isInProgress ? (
                      <div className="space-y-3">
                        {/* Active Timer */}
                        <div className="bg-[#2A2A2C] border border-[#3A3A3C] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white/70">Timer Ativo</span>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                          <InlineTimer taskId={currentTask.id} size="lg" />
                        </div>
                        
                        {/* Current Session Info */}
                        {timeSessions.length > 0 && timeSessions.some(s => !s.end_time) && (
                          <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-3">
                            <div className="text-xs text-white/60 mb-2">Sessão atual:</div>
                            {(() => {
                              const currentSession = timeSessions.find(s => !s.end_time)
                              if (currentSession) {
                                const startTime = new Date(currentSession.start_time)
                                return (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-white/70">Início:</span>
                                      <span className="font-mono text-white/90">
                                        {startTime.toLocaleString('pt-BR', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        )}

                        {/* Time per User Summary for Active Timer */}
                        {(() => {
                          const usersSummary = getUserSessionsSummary(timeSessions)
                          return usersSummary.length > 1 ? (
                            <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-white/90">Tempo por Usuário</span>
                                <span className="text-xs text-white/50">{usersSummary.length} pessoas</span>
                              </div>
                              <div className="space-y-2">
                                {usersSummary.map(({ user, totalTime: userTotalTime }) => (
                                  <div key={user.id} className="flex items-center justify-between bg-[#2A2A2C] rounded-md p-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6 border border-[#3A3A3C]">
                                        <AvatarImage src={user.avatar_url || "/minimal-avatar.png"} />
                                        <AvatarFallback className="text-xs bg-[#3A3A3C] text-white/70 font-semibold">
                                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm text-white/90 font-medium">{user.name || 'Usuário'}</span>
                                    </div>
                                    <div className="text-sm font-mono font-semibold text-blue-400">
                                      {formatTime(userTotalTime)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null
                        })()}

                        {/* Sessions History - Individual Sessions */}
                        {timeSessions.filter(s => s.end_time).length > 0 && (
                          <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-white/90">Histórico de Sessões</span>
                              <span className="text-xs text-white/50">{timeSessions.filter(s => s.end_time).length} sessões</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {timeSessions.filter(s => s.end_time).map((session, index) => {
                                const startTime = new Date(session.start_time)
                                const endTime = new Date(session.end_time)
                                const duration = session.duration_seconds || 0
                                
                                return (
                                  <div key={session.id} className="bg-[#2A2A2C] rounded-md p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 border border-[#3A3A3C]">
                                          <AvatarImage src={session.user?.avatar_url || "/minimal-avatar.png"} />
                                          <AvatarFallback className="text-xs bg-[#3A3A3C] text-white/70 font-semibold">
                                            {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="text-xs text-white/70 font-medium">
                                          {session.user?.name || 'Usuário'}
                                        </div>
                                      </div>
                                      <div className="text-xs font-mono font-semibold text-blue-400">
                                        {formatTime(duration)}
                                      </div>
                                    </div>
                                    <div className="ml-7 space-y-1">
                                      <div className="flex justify-between text-xs text-white/50">
                                        <span>Início:</span>
                                        <span className="font-mono">
                                          {startTime.toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit',
                                            year: '2-digit'
                                          })} às {startTime.toLocaleTimeString('pt-BR', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-xs text-white/50">
                                        <span>Fim:</span>
                                        <span className="font-mono">
                                          {endTime.toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit',
                                            year: '2-digit'
                                          })} às {endTime.toLocaleTimeString('pt-BR', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : totalTime > 0 ? (
                      <div className="space-y-3">
                        {/* Total Time */}
                        <div className="bg-[#2A2A2C] border border-[#3A3A3C] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white/70">Tempo Total</span>
                          </div>
                          <div className="text-2xl font-mono font-bold text-blue-400">
                            {formatTime(totalTime)}
                          </div>
                        </div>
                        
                        {/* Time per User Summary */}
                        {(() => {
                          const usersSummary = getUserSessionsSummary(timeSessions)
                          return usersSummary.length > 1 ? (
                            <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-white/90">Tempo por Usuário</span>
                                <span className="text-xs text-white/50">{usersSummary.length} pessoas</span>
                              </div>
                              <div className="space-y-2">
                                {usersSummary.map(({ user, totalTime: userTotalTime }) => (
                                  <div key={user.id} className="flex items-center justify-between bg-[#2A2A2C] rounded-md p-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6 border border-[#3A3A3C]">
                                        <AvatarImage src={user.avatar_url || "/minimal-avatar.png"} />
                                        <AvatarFallback className="text-xs bg-[#3A3A3C] text-white/70 font-semibold">
                                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm text-white/90 font-medium">{user.name || 'Usuário'}</span>
                                    </div>
                                    <div className="text-sm font-mono font-semibold text-blue-400">
                                      {formatTime(userTotalTime)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null
                        })()}
                        
                        {/* Sessions History - Individual Sessions */}
                        {timeSessions.filter(s => s.end_time).length > 0 && (
                          <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-white/90">Histórico de Sessões</span>
                              <span className="text-xs text-white/50">{timeSessions.filter(s => s.end_time).length} sessões</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {timeSessions.filter(s => s.end_time).map((session, index) => {
                                const startTime = new Date(session.start_time)
                                const endTime = new Date(session.end_time)
                                const duration = session.duration_seconds || 0
                                
                                return (
                                  <div key={session.id} className="bg-[#2A2A2C] rounded-md p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 border border-[#3A3A3C]">
                                          <AvatarImage src={session.user?.avatar_url || "/minimal-avatar.png"} />
                                          <AvatarFallback className="text-xs bg-[#3A3A3C] text-white/70 font-semibold">
                                            {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="text-xs text-white/70 font-medium">
                                          {session.user?.name || 'Usuário'}
                                        </div>
                                      </div>
                                      <div className="text-xs font-mono font-semibold text-blue-400">
                                        {formatTime(duration)}
                                      </div>
                                    </div>
                                    <div className="ml-7 space-y-1">
                                      <div className="flex justify-between text-xs text-white/50">
                                        <span>Início:</span>
                                        <span className="font-mono">
                                          {startTime.toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit',
                                            year: '2-digit'
                                          })} às {startTime.toLocaleTimeString('pt-BR', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-xs text-white/50">
                                        <span>Fim:</span>
                                        <span className="font-mono">
                                          {endTime.toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit',
                                            year: '2-digit'
                                          })} às {endTime.toLocaleTimeString('pt-BR', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-white/20 mx-auto mb-3" />
                        <p className="text-sm text-white/50">Nenhum tempo registrado ainda</p>
                        <p className="text-xs text-white/30 mt-1">Mova a tarefa para "Em Progresso" para iniciar o timer</p>
                      </div>
                    )}
                  </div>

                  {/* Checklist */}
                  {checklist.length > 0 && (
                    <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-green-400" />
                          <h3 className="text-base font-medium text-white/90">Checklist</h3>
                        </div>
                        <span className="text-sm text-white/60">
                          {completedChecklistItems}/{checklist.length} completos
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {checklist.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-[#2A2A2C] transition-colors">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleChecklistItem(item.id || index.toString())}
                              className="h-4 w-4 rounded border-[#3A3A3C] bg-[#2A2A2C] text-green-500 focus:ring-green-500 focus:ring-1"
                            />
                            <span className={cn(
                              "text-sm flex-1",
                              item.completed ? "text-white/50 line-through" : "text-white/90"
                            )}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 pt-3 border-t border-[#2E2E30]">
                        <div className="w-full bg-[#2A2A2C] rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${(completedChecklistItems / checklist.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Information Section */}
                  <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-4 mb-3">
                    <h3 className="text-base font-medium text-white/90 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-400" />
                      Equipe
                    </h3>
                    
                    {/* Creator */}
                    {(() => {
                      const creator = currentTask.user_id 
                        ? members.find(m => m.id === currentTask.user_id)
                        : null
                      
                      return creator ? (
                        <div className="mb-4">
                          <p className="text-sm text-white/60 mb-2">Criado por:</p>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-blue-500/50">
                              <AvatarImage src={creator.avatar_url || "/minimal-avatar.png"} />
                              <AvatarFallback className="text-xs bg-blue-600/20 text-blue-300 font-semibold">
                                {creator.name ? creator.name.charAt(0).toUpperCase() : 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white/90">{creator.name}</span>
                          </div>
                        </div>
                      ) : null
                    })()}
                    
                    {/* Assignees */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-white/60">Responsáveis:</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingAssignees(true)}
                          className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          Editar
                        </Button>
                      </div>
                      {(() => {
                        // Parse taskData for multiple assignees
                        let taskData: any = {}
                        try {
                          taskData = currentTask.description ? JSON.parse(currentTask.description) : {}
                        } catch {
                          taskData = {}
                        }
                        
                        const currentAssignee = currentTask.assignee_id 
                          ? members.find(m => m.id === currentTask.assignee_id)
                          : null
                        
                        const multipleAssignees = taskData.assignees && Array.isArray(taskData.assignees)
                          ? taskData.assignees
                              .map(assigneeId => members.find(m => m.id === assigneeId))
                              .filter(Boolean)
                          : (currentAssignee ? [currentAssignee] : [])
                        
                        return multipleAssignees.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {multipleAssignees.map(assignee => (
                              <div key={assignee.id} className="flex items-center gap-2 bg-[#2A2A2C] rounded-md px-2 py-1">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={assignee.avatar_url || "/minimal-avatar.png"} />
                                  <AvatarFallback className="text-xs bg-[#3A3A3C] text-white/70">
                                    {assignee.name ? assignee.name.charAt(0).toUpperCase() : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-white/90">{assignee.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/50 italic">Nenhum responsável atribuído</p>
                        )
                      })()}
                    </div>
                  </div>

              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 px-3 py-2 border-t border-[#2E2E30] bg-[#1C1C1E]">
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-9 px-3 text-white/80 hover:bg-white/5 rounded-md"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Assignees Selection Modal */}
    <Dialog open={isEditingAssignees} onOpenChange={setIsEditingAssignees}>
      <DialogContent className="bg-[#1C1C1E] border-[#2E2E30] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white/90">
            Selecionar Responsáveis
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Clique nos membros para adicionar ou remover como responsáveis
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {members.filter(m => m.id !== currentTask.user_id).map(member => (
            <div
              key={member.id}
              onClick={() => toggleAssignee(member.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
                selectedAssigneeIds.includes(member.id)
                  ? "bg-blue-600/20 border border-blue-500/50 ring-1 ring-blue-500/30"
                  : "bg-[#2A2A2C] hover:bg-[#3A3A3C] border border-[#3A3A3C]"
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || "/minimal-avatar.png"} />
                  <AvatarFallback className="bg-[#3A3A3C] text-white/70">
                    {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                {selectedAssigneeIds.includes(member.id) && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckSquare className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <p className="font-medium text-white/90">{member.name}</p>
                <p className="text-sm text-white/60">{member.email}</p>
              </div>
            </div>
          ))}
          
          {members.filter(m => m.id !== currentTask.user_id).length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/50">Nenhum membro disponível</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t border-[#2E2E30]">
          <Button
            variant="ghost"
            onClick={() => setIsEditingAssignees(false)}
            className="text-white/80 hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAssignees}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Salvar ({selectedAssigneeIds.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}