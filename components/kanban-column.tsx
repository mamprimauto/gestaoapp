"use client"

import { useState } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Edit3, Palette, Trash2, Check, X } from "lucide-react"
import KanbanCard from "./kanban-card"
import type { KanbanColumn as ColumnType } from "./kanban-board"
import type { Workspace } from "@/app/tarefas/page"
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  column: ColumnType
  tasks: any[]
  workspace: Workspace
  onCreateTask: () => void
  onMoveTask: (taskId: string, columnId: string) => void
  members: any[]
  onTaskClick?: (task: any) => void
  onUpdateColumn?: (columnId: string, updates: Partial<ColumnType>) => void
  onDeleteColumn?: (columnId: string) => void
  isCreatingTask?: boolean
  onDeleteTask?: (taskId: string) => void
  onDuplicateTask?: (taskId: string) => void
  isRequired?: boolean
}

export default function KanbanColumn({ 
  column, 
  tasks, 
  workspace, 
  onCreateTask, 
  onMoveTask, 
  members,
  onTaskClick,
  onUpdateColumn,
  onDeleteTask,
  onDuplicateTask,
  onDeleteColumn,
  isCreatingTask = false,
  isRequired = false
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState(column.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Make column sortable and droppable (apenas colunas não obrigatórias)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
    disabled: isRequired, // Desabilitar drag para colunas obrigatórias
  })
  
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColumnDragging ? 0.5 : 1,
  }

  const handleCreateTask = () => {
    onCreateTask()
    setIsAddingTask(false)
  }

  const handleSaveTitle = () => {
    if (editingTitle.trim() && editingTitle !== column.title && onUpdateColumn) {
      onUpdateColumn(column.id, { title: editingTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleCancelEdit = () => {
    setEditingTitle(column.title)
    setIsEditingTitle(false)
  }

  const handleDeleteColumn = () => {
    if (onDeleteColumn) {
      onDeleteColumn(column.id)
    }
    setShowDeleteConfirm(false)
  }


  return (
    <div 
      ref={(node) => {
        setSortableNodeRef(node)
        setDroppableNodeRef(node)
      }}
      style={style}
      className="flex flex-col h-full"
    >
      <Card className={cn(
        "kanban-column w-80 h-full flex flex-col bg-[#1A1A1C] border shadow-xl backdrop-blur-sm transition-all",
        isOver ? "border-blue-500/50 bg-blue-500/5" : "border-[#2A2A2C]",
        !isRequired && "select-none"
      )}>
        {/* Header da Coluna */}
        <CardHeader 
          className={cn(
            "flex-shrink-0 pb-4 border-b border-[#2A2A2C]",
            !isRequired && "cursor-grab active:cursor-grabbing"
          )}
          {...(!isRequired ? attributes : {})}
          {...(!isRequired ? listeners : {})}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-lg flex-shrink-0">
                  {column.icon}
                </div>
                
                {/* Editable Title - apenas para colunas não obrigatórias */}
                {isEditingTitle && !isRequired ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="bg-[#2A2A2C] border-[#3A3A3C] text-white text-sm font-bold h-8 px-2"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveTitle}
                      className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 w-8 p-0 hover:bg-[#2A2A2C] text-white/60 hover:text-white/90"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 
                      className={cn(
                        "font-bold text-white/90 text-sm transition-colors flex-1 truncate",
                        !isRequired && "cursor-pointer hover:text-white"
                      )}
                      onClick={() => !isRequired && setIsEditingTitle(true)}
                      title={column.title}
                    >
                      {column.title}
                    </h3>
                    <span className="bg-[#2A2A2C] text-white/80 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm border border-[#3A3A3C] flex-shrink-0">
                      {tasks.length}
                    </span>
                  </>
                )}
              </div>

              {/* Menu de opções - apenas para colunas não obrigatórias */}
              {!isRequired && (
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white/80 hover:bg-[#2A2A2C]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="bg-[#1C1C1E] border-[#2A2A2C] text-white"
                    align="end"
                  >
                    <DropdownMenuItem 
                      onClick={() => {
                        setIsEditingTitle(true)
                        setDropdownOpen(false)
                      }}
                      className="hover:bg-white/10 cursor-pointer focus:bg-white/10"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar nome
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#2A2A2C]" />
                    <DropdownMenuItem 
                      onClick={() => {
                        setShowDeleteConfirm(true)
                        setDropdownOpen(false)
                      }}
                      className="hover:bg-red-500/10 cursor-pointer focus:bg-red-500/10 text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir coluna
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
            </div>
          </CardHeader>

          {/* Botão Adicionar - apenas em Pendentes e Lembretes */}
          {(column.id === 'todo' || column.id === 'inbox') && (
            <div className="px-4 pb-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateTask}
                disabled={isCreatingTask}
                className="w-full text-white/60 hover:bg-[#2A2A2C] border-dashed border-[#3A3A3C] hover:border-[#4A4A4C] hover:text-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingTask ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white/60"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {column.id === 'inbox' ? 'Solicitar tarefa' : 'Adicionar tarefa'}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Lista de Tarefas */}
          <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
            <SortableContext
              items={tasks.map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 py-2">
                {tasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    workspace={workspace}
                    members={members}
                    onTaskClick={onTaskClick}
                    onDelete={onDeleteTask}
                    onDuplicate={onDuplicateTask}
                    columnId={column.id}
                  />
                ))}
                
                
                {tasks.length === 0 && (
                  column.id === 'todo' ? (
                    // Mensagem motivacional especial para "A Fazer" quando vazia
                    <div className="text-center py-6 px-2">
                      <div className="py-4 px-3">
                        <div className="mb-3">
                          <div className="mx-auto w-8 h-8 mb-3 bg-[#2A2A2C] rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-400" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-white/90 text-xs font-medium">Todas as tarefas concluídas</div>
                        </div>
                      </div>
                    </div>
                  ) : column.id === 'inbox' ? (
                    // Mensagem especial para "Lembretes" quando vazia
                    <div className="text-center py-6 px-3">
                      <div className="border border-[#3A3A3C] rounded-lg p-4 bg-[#1E1E20]">
                        <div className="mb-3">
                          <div className="mx-auto w-8 h-8 mb-3 bg-[#2A2A2C] rounded-full flex items-center justify-center">
                            <Plus className="h-4 w-4 text-purple-400" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-white/90 text-xs font-medium mb-2">Seus lembretes</div>
                          <div className="text-white/60 text-xs leading-relaxed">
                            Adicione avisos, lembretes, anotações rápidas, ideias ou qualquer informação importante. 
                            Use este espaço da forma que achar mais útil para organizar seus pensamentos e tarefas.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Mensagem padrão para outras colunas
                    <div className="text-center py-8 text-white/50">
                      <div className="text-white/40 mb-3 text-sm">Nenhuma tarefa</div>
                    </div>
                  )
                )}
              </div>
            </SortableContext>
          </CardContent>
        </Card>
        
        {/* Modal de confirmação para deletar coluna */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1C1C1E] border border-[#2A2A2C] rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Excluir coluna</h3>
                  <p className="text-sm text-white/60">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-white/80">
                  Tem certeza que deseja excluir a coluna <strong>"{column.title}"</strong>?
                </p>
                {tasks.length > 0 && (
                  <p className="text-amber-400 text-sm mt-2">
                    ⚠️ {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} ser{tasks.length !== 1 ? 'ão' : 'á'} movida{tasks.length !== 1 ? 's' : ''} para a primeira coluna.
                  </p>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 border-[#3A3A3C] text-white/70 hover:text-white hover:bg-[#2A2A2C]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteColumn}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir coluna
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}