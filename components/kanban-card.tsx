"use client"

import { useState, forwardRef, memo, useMemo } from "react"
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
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Workspace } from "@/app/tarefas/page"
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MultiUserTimer } from "./multi-user-timer"

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

  // Encontrar o responsável (não atribuir aleatório se não foi definido)
  let assignee = task.assignee_id 
    ? members.find(m => m.id === task.assignee_id)
    : null
  
  // Parse da descrição para obter dados adicionais
  let taskData: any = {} // Parse task description JSON
  try {
    taskData = task.description ? JSON.parse(task.description) : {}
  } catch {
    taskData = {}
  }

  // Encontrar o criador da tarefa
  const creator = members.find(m => m.id === task.user_id) || null
  
  // Construir lista de múltiplos responsáveis
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


  const hasChecklist = taskData.checklist && taskData.checklist.length > 0
  const completedChecklistItems = taskData.checklist?.filter((item: any) => item.completed).length || 0
  const totalChecklistItems = taskData.checklist?.length || 0

  const hasComments = task.comments && task.comments.length > 0
  const hasAttachments = task.files && task.files.length > 0

  // Formatação da data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    const currentDate = new Date()
    const diffTime = date.getTime() - currentDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Hoje"
    if (diffDays === 1) return "Amanhã" 
    if (diffDays === -1) return "Ontem"
    if (diffDays < 0) return `${Math.abs(diffDays)}d atrás`
    return `Em ${diffDays}d`
  }

  // Só considera vencida se for antes de hoje (não incluindo hoje)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = task.due_date ? new Date(task.due_date + 'T00:00:00') : null
  const isOverdue = dueDate && dueDate < today;
  
  // Verificar se a tarefa está concluída (na coluna 'done')
  const isCompleted = columnId === 'done'

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("cursor-grab active:cursor-grabbing", isDragging && "cursor-grabbing")}>
      <Card
        className={cn(
          "kanban-card group bg-[#1E1E20] border border-[#2A2A2C] shadow-lg hover:shadow-xl transition-all duration-200 hover:border-[#3A3A3C]",
          "rounded-lg overflow-hidden select-none",
          isDragging && "shadow-2xl ring-2 ring-blue-500/50 scale-105 rotate-1",
          isCompleted && "bg-[#1A1A1C] border-[#2A2A2C] opacity-80"
        )}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation()
            onTaskClick?.(task)
          }
        }}
      >
        <CardContent className="p-4">
          {/* Header do Card */}
          <div className="mb-3">
            {/* Linha 1: Título + Comentários + Menu */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-semibold text-sm leading-tight line-clamp-2 transition-colors",
                  isCompleted 
                    ? "text-white/40 line-through" 
                    : "text-white/90 group-hover:text-white"
                )}>
                  {task.title}
                </h4>
              </div>
              
              <div className="flex items-center gap-2 ml-2">
                {/* Ícone de comentários */}
                {hasComments && (
                  <div className="flex items-center gap-1.5 text-white/50 hover:text-white/70 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{task.comments?.length}</span>
                  </div>
                )}
                
                {/* Menu dropdown */}
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
                        e.preventDefault()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (showDeleteConfirm) {
                          onDelete?.(task.id)
                          setShowDeleteConfirm(false)
                          setDropdownOpen(false)
                        } else {
                          setShowDeleteConfirm(true)
                          setTimeout(() => {
                            setShowDeleteConfirm(false)
                          }, 5000)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {showDeleteConfirm ? '⚠️ Confirmar exclusão' : 'Excluir'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Linha 2: Tags/Labels */}
            {(task.priority || taskData.status) && (
              <div className="flex items-center gap-1 flex-wrap">
                {task.priority && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-2.5 py-1 font-medium border",
                      isCompleted 
                        ? "bg-gray-500/20 text-gray-400 border-gray-500/40 opacity-60" 
                        : priorityColors[task.priority as keyof typeof priorityColors]
                    )}
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    {priorityLabels[task.priority as keyof typeof priorityLabels]}
                  </Badge>
                )}
                
                {taskData.status && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-2.5 py-1 font-medium",
                      isCompleted 
                        ? "bg-gray-500/20 text-gray-400 border-gray-500/40 opacity-60" 
                        : "bg-purple-500/20 text-purple-400 border-purple-500/40"
                    )}
                  >
                    {taskData.status}
                  </Badge>
                )}
              </div>
            )}
          </div>


        {/* Checklist Progress */}
        {hasChecklist && (
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
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#2A2A2C]">
          {/* Ícones de atividade */}
          <div className="flex items-center gap-3">
            {hasAttachments && (
              <div className="flex items-center gap-1.5 text-white/50 hover:text-white/70 transition-colors">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{task.files?.length}</span>
              </div>
            )}

            {/* Data de prazo - ocultar na aba concluído */}
            {task.due_date && !isCompleted && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-all",
                isOverdue 
                  ? "text-white/70 bg-[#2E2E30] border border-[#4A4A4C]" 
                  : "text-white/60 bg-[#2A2A2C] border border-[#3A3A3C] hover:bg-[#2E2E30]"
              )}>
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}
            
            {/* Timer Multi-usuário */}
            <div onClick={(e) => e.stopPropagation()}>
              <MultiUserTimer 
                taskId={task.id} 
                size="sm" 
                showActiveUsers={true}
              />
            </div>
          </div>

          {/* Avatares dos responsáveis e criador */}
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
                
                {/* Avatar do criador (sempre à direita) */}
                {creator && (
                  <Avatar className="h-6 w-6 border-2 border-blue-500/40 shadow-sm ring-1 ring-blue-400/30 ml-1">
                    <AvatarImage src={creator.avatar_url || "/minimal-avatar.png"} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-600/80 to-blue-500/60 text-white font-semibold">
                      {creator.name ? creator.name.charAt(0).toUpperCase() : 'C'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ) : creator ? (
              /* Apenas criador quando não há responsáveis */
              <Avatar className="h-6 w-6 border-2 border-blue-500/40 shadow-sm ring-1 ring-blue-400/30">
                <AvatarImage src={creator.avatar_url || "/minimal-avatar.png"} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-600/80 to-blue-500/60 text-white font-semibold">
                  {creator.name ? creator.name.charAt(0).toUpperCase() : 'C'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-dashed border-[#3A3A3C] flex items-center justify-center hover:border-[#4A4A4C] transition-colors">
                <User className="h-3 w-3 text-white/40" />
              </div>
            )}
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(KanbanCard)
