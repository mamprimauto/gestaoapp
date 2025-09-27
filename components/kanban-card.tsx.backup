"use client"

import { useState, useEffect, forwardRef, memo, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  MessageCircle, 
  Paperclip, 
  MoreHorizontal,
  User,
  Clock,
  Flag,
  CheckSquare,
  Trash2,
  Check,
  Send,
  Inbox
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Workspace } from "@/app/tarefas/page"
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { InlineTimer } from './inline-timer'
import { getTotalTimeForTask, formatTime } from '@/lib/timer-utils'

interface KanbanCardProps {
  task: any
  workspace: Workspace
  members: any[]
  onTaskClick?: (task: any) => void
  onDelete?: (taskId: string) => void
  onDuplicate?: (taskId: string) => void
  columnId?: string
}

const priorityColors = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  med: "bg-amber-500/20 text-amber-400 border-amber-500/40", 
  high: "bg-red-500/20 text-red-400 border-red-500/40"
}

const priorityLabels = {
  low: "Baixa",
  med: "Média",
  high: "Alta"
}

function KanbanCard({ task, workspace, members, onTaskClick, onDelete, onDuplicate, columnId }: KanbanCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Make the card draggable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  // Parse da descrição para obter dados adicionais
  let taskData: any = {}
  try {
    taskData = task.description ? JSON.parse(task.description) : {}
  } catch {
    taskData = {}
  }

  // Encontrar o criador da tarefa
  const creator = task.user_id 
    ? members.find(m => m.id === task.user_id)
    : null

  // Encontrar o responsável (suporte a múltiplos assignees futuramente)
  const assignee = task.assignee_id 
    ? members.find(m => m.id === task.assignee_id)
    : null

  // Separar responsáveis do criador
  const assignees = useMemo(() => {
    if (taskData.assignees && Array.isArray(taskData.assignees)) {
      return taskData.assignees
        .map(assigneeId => members.find(m => m.id === assigneeId))
        .filter(Boolean)
        .filter(a => a.id !== creator?.id) // Remover criador dos responsáveis se estiver incluído
    } else if (assignee && assignee.id !== creator?.id) {
      return [assignee]
    }
    return []
  }, [taskData.assignees, assignee, creator, members])

  // Verificar se é um item da inbox
  const isInboxItem = taskData.type === 'inbox'
  const inboxTags = isInboxItem ? (taskData.tags || []) : []

  const hasChecklist = taskData.checklist && taskData.checklist.length > 0
  const completedChecklistItems = taskData.checklist?.filter((item: any) => item.completed).length || 0
  const totalChecklistItems = taskData.checklist?.length || 0

  const hasComments = task.comments && task.comments.length > 0
  const hasAttachments = task.files && task.files.length > 0
  
  // Check if this is a completed task
  const isCompleted = columnId === 'done'
  
  // Check if this task was completed today
  const isCompletedToday = useMemo(() => {
    if (!isCompleted || !task.updated_at) return false
    
    // Pegar a data atual no fuso horário local
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Pegar a data de atualização da tarefa
    const taskUpdatedDate = new Date(task.updated_at)
    const taskDate = new Date(taskUpdatedDate.getFullYear(), taskUpdatedDate.getMonth(), taskUpdatedDate.getDate())
    
    return taskDate.getTime() === today.getTime()
  }, [isCompleted, task.updated_at])
  
  // Check if this task is in progress (should show active timer)
  const isInProgress = columnId === 'in-progress'
  
  // State for total time (for non-in-progress cards)
  const [totalTime, setTotalTime] = useState(0)
  
  // Load total time for all tasks (except in-progress which uses live timer)
  useEffect(() => {
    if (!isInProgress && !task.id.toString().startsWith('temp-')) {
      // Cache com versão para forçar refresh após correção da API
      const cacheKey = `task-time-v4-${task.id}`
      const cached = sessionStorage.getItem(cacheKey)
      
      if (cached) {
        setTotalTime(parseInt(cached))
        return
      }
      
      getTotalTimeForTask(task.id).then(result => {
        setTotalTime(result.totalSeconds)
        // Cache por 5 minutos com nova versão
        sessionStorage.setItem(cacheKey, result.totalSeconds.toString())
        setTimeout(() => {
          sessionStorage.removeItem(cacheKey)
        }, 5 * 60 * 1000)
      })
    }
  }, [task.id, isInProgress])

  // Formatação da data
  const formatDate = (dateString: string) => {
    // Criar data no fuso horário local
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    
    // Comparar apenas as datas (sem horário)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    const diffTime = dateOnly.getTime() - todayOnly.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Hoje"
    if (diffDays === 1) return "Amanhã" 
    if (diffDays === -1) return "Ontem"
    if (diffDays < 0) return `${Math.abs(diffDays)}d atrás`
    return `${diffDays}d`
  }

  // Só considera vencida se for antes de hoje (não incluindo hoje)
  const now = new Date()
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDate = task.due_date ? new Date(task.due_date + 'T00:00:00') : null
  const dueDateOnly = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null
  const isOverdue = dueDateOnly && dueDateOnly < todayOnly
  const isDueToday = dueDateOnly && dueDateOnly.getTime() === todayOnly.getTime()
  
  // Mostrar visual de atraso apenas para tarefas ativas (A Fazer ou Em Progresso)
  const shouldShowOverdueStyle = isOverdue && (columnId === 'todo' || columnId === 'in-progress')
  const shouldShowTodayStyle = isDueToday && (columnId === 'todo' || columnId === 'in-progress')

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "cursor-grabbing"
      )}
    >
      <Card
        className={cn(
          "kanban-card group bg-[#1E1E20] border border-[#2A2A2C] shadow-lg hover:shadow-xl transition-all duration-200 hover:border-[#3A3A3C]",
          "rounded-lg overflow-hidden select-none",
          shouldShowOverdueStyle && "border-red-500 ring-1 ring-red-500/50",
          isDragging && "shadow-2xl ring-2 ring-blue-500/50 scale-105 rotate-1",
          isCompleted && "opacity-60 grayscale blur-[0.5px] bg-[#1A1A1A] border-gray-600/40"
        )}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation()
            onTaskClick?.(task)
          }
        }}
      >
        <CardContent className="p-3">
          {/* Header do Card */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                {/* Ícone de check para tarefas concluídas */}
                {isCompleted && (
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
                <h4 className={cn(
                  "font-medium text-white/90 text-xs leading-tight line-clamp-2 mb-1 group-hover:text-white transition-colors",
                  isCompleted && "line-through text-white/30"
                )}>
                  {task.title}
                </h4>
              </div>
            </div>
            
            {/* Ícone de comentários no canto superior direito */}
            {hasComments && (
              <div className="flex items-center gap-1.5 text-white/50 hover:text-white/70 transition-colors ml-2">
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{task.comments?.length}</span>
              </div>
            )}
          </div>
            
          {/* Labels/Tags */}
          <div className="flex items-center gap-1 flex-wrap mb-2">
            {/* Tag "CONCLUÍDA HOJE" para tarefas completadas hoje */}
            {isCompletedToday && (
              <Badge 
                variant="outline" 
                className="text-xs px-2.5 py-1 font-medium bg-green-500/20 text-green-400 border-green-500/40"
              >
                CONCLUÍDA HOJE
              </Badge>
            )}

            {/* Cross-Department Request Badges */}
            {(task.description?.includes('ENVIADA') || task.title?.includes('📤')) && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 font-medium bg-blue-500/20 text-blue-400 border-blue-500/40 flex items-center gap-1"
              >
                <Send className="h-3 w-3" />
                ENVIADA
              </Badge>
            )}
            
            {(task.description?.includes('RECEBIDA') || task.title?.includes('📥')) && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 font-medium bg-orange-500/20 text-orange-400 border-orange-500/40 flex items-center gap-1"
              >
                <Inbox className="h-3 w-3" />
                RECEBIDA
              </Badge>
            )}

            {/* Tags da Inbox - Hidden for completed tasks */}
            {!isCompleted && isInboxItem && inboxTags.map((tag: any, index: number) => (
              <Badge 
                key={index}
                style={{ backgroundColor: tag.color + '20', borderColor: tag.color + '40', color: tag.color }}
                className="text-xs px-2 py-0.5 font-medium border"
              >
                {tag.name}
              </Badge>
            ))}

            {/* Tags de prioridade - apenas para tarefas não-inbox e não completadas */}
            {!isCompleted && !isInboxItem && task.priority && (
              <Badge 
                variant="outline" 
                className={cn("text-xs px-2.5 py-1 font-medium border", priorityColors[task.priority as keyof typeof priorityColors])}
              >
                <Flag className="h-3 w-3 mr-1" />
                {priorityLabels[task.priority as keyof typeof priorityLabels]}
              </Badge>
            )}
            
            {!isCompleted && !isInboxItem && taskData.status && (
              <Badge variant="outline" className="text-xs px-2.5 py-1 font-medium bg-purple-500/20 text-purple-400 border-purple-500/40">
                {taskData.status}
              </Badge>
            )}
          </div>

          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#2C2C2E] border-[#3A3A3C]">
              <DropdownMenuItem 
                className={cn(
                  "cursor-pointer transition-all",
                  showDeleteConfirm 
                    ? "bg-red-900/30 text-red-300 hover:bg-red-900/40 font-semibold" 
                    : "text-red-400 hover:bg-red-900/20 hover:text-red-300"
                )}
                onSelect={(e) => {
                  e.preventDefault() // Impede o dropdown de fechar
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (showDeleteConfirm) {
                    onDelete?.(task.id)
                    setShowDeleteConfirm(false)
                    setDropdownOpen(false) // Fecha apenas após confirmar
                  } else {
                    setShowDeleteConfirm(true)
                    setTimeout(() => {
                      setShowDeleteConfirm(false)
                    }, 5000) // Aumentado para 5 segundos
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {showDeleteConfirm ? '⚠️ Confirmar exclusão' : 'Excluir'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Descrição (se houver) - Hidden for completed tasks */}
        {!isCompleted && (
          <>
            {/* Conteúdo da inbox */}
            {isInboxItem && taskData.content && (
              <p className="text-xs text-white/50 mb-2 line-clamp-2">
                {taskData.content}
              </p>
            )}
            
            {/* Descrição normal para tarefas não-inbox */}
            {!isInboxItem && task.description && !taskData.checklist && (
              <p className="text-xs text-white/50 mb-2 line-clamp-2">
                {(() => {
                  // Se a descrição é um JSON válido com campos estruturados, não mostrar
                  try {
                    const parsed = JSON.parse(task.description)
                    // Se contém campos estruturados como assignees, checklist, etc., não mostrar
                    if (parsed && (parsed.assignees || parsed.checklist || parsed.type || parsed.status)) {
                      return taskData.content || '' // Mostrar conteúdo específico se houver
                    }
                  } catch {
                    // Se não é JSON válido, mostrar a descrição normalmente
                  }
                  return typeof task.description === 'string' ? task.description : ''
                })()}
              </p>
            )}
          </>
        )}

        {/* Checklist Progress - Hidden for completed tasks */}
        {!isCompleted && hasChecklist && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg border border-green-500/20">
            <CheckSquare className="h-4 w-4 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-300">Checklist</span>
                <span className="text-xs font-bold text-green-200">
                  {completedChecklistItems}/{totalChecklistItems}
                </span>
              </div>
              <div className="w-full bg-green-800/30 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(completedChecklistItems / totalChecklistItems) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer do Card */}
        {isCompleted ? (
          // Simplified footer for completed tasks - always show timer
          <div className="flex items-center justify-center pt-3 mt-2 border-t border-gray-600/40">
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono font-medium">{formatTime(totalTime)}</span>
            </div>
          </div>
        ) : (
          // Full footer for active tasks
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#2A2A2C]">
          {/* Ícones de atividade */}
          <div className="flex items-center gap-3">
            {hasAttachments && (
              <div className="flex items-center gap-1.5 text-white/50 hover:text-white/70 transition-colors">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{task.files?.length}</span>
              </div>
            )}

            {/* Data de prazo */}
            {task.due_date && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-all",
                shouldShowOverdueStyle 
                  ? "text-red-400 bg-red-500/10 border border-red-500/40" 
                  : shouldShowTodayStyle
                  ? "text-blue-400 bg-blue-500/10 border border-blue-500/40"
                  : "text-white/60 bg-[#2A2A2C] border border-[#3A3A3C] hover:bg-[#2E2E30]"
              )}>
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}
            
            {/* Timer Component */}
            {isInProgress ? (
              // Active timer for in-progress tasks
              <InlineTimer taskId={task.id} size="sm" />
            ) : (columnId === 'inbox' ? (
              // Don't show timer for inbox tasks
              null
            ) : (
              // Always show total time for pending, completed and other tasks
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono font-medium">{formatTime(totalTime)}</span>
              </div>
            ))}
          </div>

          {/* Avatars dos responsáveis e criador */}
          <div className="flex items-center justify-between gap-1">
            {/* Responsáveis à esquerda */}
            <div className="flex items-center">
              {assignees.length > 0 ? (
                <div className="flex -space-x-0.5">
                  {assignees.slice(0, 2).map((person, index) => (
                    <Avatar key={person.id} className="h-6 w-6 border-2 border-[#2A2A2C] shadow-sm ring-1 ring-[#3A3A3C]">
                      <AvatarImage src={person.avatar_url || "/minimal-avatar.png"} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-[#2A2A2C] to-[#3A3A3C] text-white/70 font-semibold">
                        {person.name ? person.name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignees.length > 2 && (
                    <div className="h-6 w-6 rounded-full border-2 border-[#2A2A2C] bg-[#2A2A2C] flex items-center justify-center">
                      <span className="text-xs text-white/70 font-semibold">+{assignees.length - 2}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-dashed border-[#3A3A3C] flex items-center justify-center hover:border-[#4A4A4C] transition-colors">
                  <User className="h-3 w-3 text-white/40" />
                </div>
              )}
            </div>
            
            {/* Criador sempre à direita */}
            {creator && (
              <Avatar className="h-6 w-6 border-2 border-[#2A2A2C] shadow-sm ring-1 ring-[#3A3A3C]">
                <AvatarImage src={creator.avatar_url || "/minimal-avatar.png"} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-[#2A2A2C] to-[#3A3A3C] text-white/70 font-semibold">
                  {creator.name ? creator.name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
        )}
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(KanbanCard)
