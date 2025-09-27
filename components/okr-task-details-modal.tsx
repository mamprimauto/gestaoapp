"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Trash2, 
  Loader2, 
  MessageSquare, 
  CheckSquare,
  Target,
  Clock,
  Edit2,
  Check,
  X
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import OKRTaskComments from "./okr-task-comments"
import { type OKRTask, useOKRData } from "./okr-data-context"

interface ChecklistItem {
  id: string
  content: string
  completed: boolean
  position: number
  created_at: string
  updated_at: string
}

interface OKRTaskDetailsModalProps {
  task: OKRTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdate?: () => void
}

export default function OKRTaskDetailsModal({
  task,
  open,
  onOpenChange,
  onTaskUpdate
}: OKRTaskDetailsModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newItemContent, setNewItemContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [commentsCount, setCommentsCount] = useState(0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [savingTitle, setSavingTitle] = useState(false)
  const [localTask, setLocalTask] = useState<OKRTask | null>(null)
  const [dueDate, setDueDate] = useState<string>("")
  const [savingDueDate, setSavingDueDate] = useState(false)
  const [hasUnsavedDate, setHasUnsavedDate] = useState(false)
  const [dueDateOption, setDueDateOption] = useState<'hoje' | 'amanha' | 'outro'>('hoje')
  
  // Get OKR context functions
  const { updateTask } = useOKRData()

  // Helper functions for dates (Brazil timezone)
  const getTodayDate = () => {
    const today = new Date()
    const brazilTime = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    return brazilTime.toISOString().split('T')[0]
  }

  const getTomorrowDate = () => {
    const today = new Date()
    const brazilTime = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    brazilTime.setDate(brazilTime.getDate() + 1)
    return brazilTime.toISOString().split('T')[0]
  }

  // Update local task when prop changes
  useEffect(() => {
    setLocalTask(task)
    const taskDueDate = task?.due_date || getTodayDate()
    setDueDate(taskDueDate)
    
    // Determine which option is selected based on the date
    const today = getTodayDate()
    const tomorrow = getTomorrowDate()
    
    if (taskDueDate === today) {
      setDueDateOption('hoje')
    } else if (taskDueDate === tomorrow) {
      setDueDateOption('amanha')
    } else {
      setDueDateOption('outro')
    }
    
    setHasUnsavedDate(false)
  }, [task])

  // Load checklist for the task
  const loadChecklist = useCallback(async () => {
    if (!task?.id) return

    try {
      const supabase = await getSupabaseClient()
      const { data: refreshData } = await supabase.auth.refreshSession()
      const session = refreshData.session || (await supabase.auth.getSession()).data.session
      
      if (!session?.access_token) {
        setChecklist([])
        return
      }

      const res = await fetch(`/api/okr/tasks/${task.id}/checklist`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const data = await res.json()
      if (res.ok && data.checklist) {
        setChecklist(data.checklist)
      } else {
        setChecklist([])
      }
    } catch (error) {

      setChecklist([])
    }
  }, [task?.id])

  // Load comments count
  const loadCommentsCount = useCallback(async () => {
    if (!task?.id) return

    try {
      const supabase = await getSupabaseClient()
      const { data: refreshData } = await supabase.auth.refreshSession()
      const session = refreshData.session || (await supabase.auth.getSession()).data.session
      
      if (!session?.access_token) {
        setCommentsCount(0)
        return
      }

      const res = await fetch(`/api/okr/tasks/${task.id}/comments`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const data = await res.json()
      if (res.ok && data.comments) {
        setCommentsCount(data.comments.length)
      } else {
        setCommentsCount(0)
      }
    } catch (error) {
      setCommentsCount(0)
    }
  }, [task?.id])

  // Handle title editing
  const startEditingTitle = () => {
    setEditedTitle(localTask?.title || "")
    setIsEditingTitle(true)
  }

  const cancelEditingTitle = () => {
    setIsEditingTitle(false)
    setEditedTitle("")
  }

  const saveTitle = async () => {
    if (!localTask?.id || !editedTitle.trim() || editedTitle === localTask.title) {
      cancelEditingTitle()
      return
    }

    setSavingTitle(true)
    try {
      const success = await updateTask(localTask.id, { title: editedTitle.trim() })
      
      if (success) {
        // Update local task immediately for UI feedback
        setLocalTask(prev => prev ? { ...prev, title: editedTitle.trim() } : null)
        
        setIsEditingTitle(false)
        setEditedTitle("")
        onTaskUpdate?.() // Notify parent to refresh data
        
        toast({
          title: "Título atualizado",
          description: "O título da tarefa foi alterado com sucesso",
        })
      } else {
        throw new Error("Falha ao atualizar título")
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar título",
        description: error.message || "Tente novamente",
        variant: "destructive",
      })
    } finally {
      setSavingTitle(false)
    }
  }

  // Handle due date saving
  const saveDueDate = async (newDueDate: string) => {
    if (!localTask?.id) return

    setSavingDueDate(true)
    try {
      const success = await updateTask(localTask.id, { 
        due_date: newDueDate || null 
      })
      
      if (success) {
        // Update local task immediately for UI feedback
        setLocalTask(prev => prev ? { ...prev, due_date: newDueDate || null } : null)
        setHasUnsavedDate(false)
        onTaskUpdate?.() // Notify parent to refresh data
        
        toast({
          title: "Prazo atualizado",
          description: newDueDate 
            ? `Prazo definido para ${new Date(newDueDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
            : "Prazo removido da tarefa",
        })
      } else {
        throw new Error("Falha ao atualizar prazo")
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar prazo",
        description: error.message || "Tente novamente",
        variant: "destructive",
      })
      // Revert the local state on error
      setDueDate(localTask?.due_date || "")
    } finally {
      setSavingDueDate(false)
    }
  }

  // Handle date option change
  const handleDateOptionChange = (option: 'hoje' | 'amanha' | 'outro') => {
    setDueDateOption(option)
    
    if (option === 'hoje') {
      const today = getTodayDate()
      setDueDate(today)
      // Automatically save for quick options
      saveDueDate(today)
    } else if (option === 'amanha') {
      const tomorrow = getTomorrowDate()
      setDueDate(tomorrow)
      // Automatically save for quick options
      saveDueDate(tomorrow)
    }
    // For 'outro', just change the option but keep current date
  }

  // Load data when modal opens
  useEffect(() => {
    if (open && task?.id) {
      setLoading(true)
      Promise.all([
        loadChecklist(),
        loadCommentsCount()
      ]).finally(() => {
        setLoading(false)
      })
    }
  }, [open, task?.id, loadChecklist, loadCommentsCount])

  // Add checklist item
  const addChecklistItem = async () => {
    if (!newItemContent.trim() || !task?.id) return

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: refreshData } = await supabase.auth.refreshSession()
      const session = refreshData.session || (await supabase.auth.getSession()).data.session
      
      if (!session?.access_token) {
        throw new Error("Sessão expirada")
      }

      const res = await fetch(`/api/okr/tasks/${task.id}/checklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: newItemContent.trim(),
          position: checklist.length
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setChecklist(prev => [...prev, data.item])
      setNewItemContent("")
      
      toast({
        title: "Item adicionado",
        description: "Item da checklist criado com sucesso",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Update checklist item
  const updateChecklistItem = async (itemId: string, updates: Partial<ChecklistItem>) => {
    if (!task?.id) return

    try {
      const supabase = await getSupabaseClient()
      const { data: refreshData } = await supabase.auth.refreshSession()
      const session = refreshData.session || (await supabase.auth.getSession()).data.session
      
      if (!session?.access_token) {
        throw new Error("Sessão expirada")
      }

      const res = await fetch(`/api/okr/tasks/${task.id}/checklist`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          itemId,
          ...updates
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setChecklist(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ))
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Remove checklist item
  const removeChecklistItem = async (itemId: string) => {
    if (!task?.id) return

    try {
      const supabase = await getSupabaseClient()
      const { data: refreshData } = await supabase.auth.refreshSession()
      const session = refreshData.session || (await supabase.auth.getSession()).data.session
      
      if (!session?.access_token) {
        throw new Error("Sessão expirada")
      }

      const res = await fetch(`/api/okr/tasks/${task.id}/checklist?itemId=${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setChecklist(prev => prev.filter(item => item.id !== itemId))
      
      toast({
        title: "Item removido",
        description: "Item da checklist removido com sucesso",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Get status badge color
  const getStatusColor = (completed: boolean) => {
    return completed ? "bg-green-500" : "bg-yellow-500"
  }

  const getStatusLabel = (completed: boolean) => {
    return completed ? "Concluída" : "Pendente"
  }

  if (!localTask) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[90vh] bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C] rounded-xl p-0 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2E2E30]">
          <DialogHeader>
            <DialogTitle className="text-[#F2F2F7] flex items-center gap-2 text-[15px]">
              <Target className="h-4 w-4 text-white/70" />
              Detalhes da Tarefa OKR
            </DialogTitle>
            <DialogDescription className="text-white/65 text-[12px]">
              Gerencie a checklist e acompanhe os comentários desta tarefa.
            </DialogDescription>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex-1 grid place-items-center py-10 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin mr-2 inline" />
            Carregando...
          </div>
        ) : (
          <>
            {/* Main Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-[#1E1E20] scrollbar-thumb-[#3A3A3C] hover:scrollbar-thumb-[#4A4A4C]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 p-3 lg:p-4 min-h-full">
                  
                  {/* Left Column - Task Info and Checklist */}
                  <div className="space-y-4">
                    {/* Task Info */}
                    <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <Target className="h-4 w-4 text-[#7C8CF8]" />
                        <label className="text-[12px] font-medium text-white/90">Informações da Tarefa</label>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-white/70 mb-1 block">Título</label>
                          {isEditingTitle ? (
                            <div className="flex gap-2">
                              <Input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="flex-1 bg-[#2A2A2C] border-[#3A3A3C] text-white text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveTitle()
                                  } else if (e.key === 'Escape') {
                                    cancelEditingTitle()
                                  }
                                }}
                                autoFocus
                                disabled={savingTitle}
                              />
                              <Button
                                size="sm"
                                onClick={saveTitle}
                                disabled={savingTitle || !editedTitle.trim()}
                                className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                              >
                                {savingTitle ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditingTitle}
                                disabled={savingTitle}
                                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-[#2A2A2C] border border-[#3A3A3C] rounded-md px-3 py-2 text-sm text-white/90">
                                {localTask.title}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={startEditingTitle}
                                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                title="Editar título"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", getStatusColor(localTask.completed))} />
                            <span className="text-xs text-white/70">
                              {getStatusLabel(localTask.completed)}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-[10px] text-white/70 mb-1 block">Prazo</label>
                          
                          {/* Option buttons */}
                          <div className="flex gap-1 mb-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={dueDateOption === 'hoje' ? 'default' : 'outline'}
                              onClick={() => handleDateOptionChange('hoje')}
                              className={cn(
                                "h-7 px-3 text-xs",
                                dueDateOption === 'hoje' 
                                  ? "bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90" 
                                  : "border-[#3A3A3C] text-white/80 hover:bg-white/10"
                              )}
                              disabled={savingDueDate}
                            >
                              Hoje
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={dueDateOption === 'amanha' ? 'default' : 'outline'}
                              onClick={() => handleDateOptionChange('amanha')}
                              className={cn(
                                "h-7 px-3 text-xs",
                                dueDateOption === 'amanha' 
                                  ? "bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90" 
                                  : "border-[#3A3A3C] text-white/80 hover:bg-white/10"
                              )}
                              disabled={savingDueDate}
                            >
                              Amanhã
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={dueDateOption === 'outro' ? 'default' : 'outline'}
                              onClick={() => handleDateOptionChange('outro')}
                              className={cn(
                                "h-7 px-3 text-xs",
                                dueDateOption === 'outro' 
                                  ? "bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90" 
                                  : "border-[#3A3A3C] text-white/80 hover:bg-white/10"
                              )}
                              disabled={savingDueDate}
                            >
                              Outro
                            </Button>
                          </div>

                          {/* Date input (shown when 'outro' is selected) */}
                          {dueDateOption === 'outro' && (
                            <div className="relative mb-2">
                              <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => {
                                  setDueDate(e.target.value)
                                  setHasUnsavedDate(e.target.value !== (localTask?.due_date || ""))
                                }}
                                onBlur={() => {
                                  if (hasUnsavedDate) {
                                    saveDueDate(dueDate)
                                  }
                                }}
                                className={cn(
                                  "bg-[#2A2A2C] border-[#3A3A3C] text-white text-sm h-8 pr-8",
                                  hasUnsavedDate && "border-yellow-500/50"
                                )}
                                disabled={savingDueDate}
                              />
                              <button
                                onClick={() => {
                                  setDueDate("")
                                  saveDueDate("")
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"
                                disabled={savingDueDate}
                                title="Limpar prazo"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          {/* Date info and status */}
                          <div className="flex justify-between items-center text-[10px]">
                            {dueDate && (
                              <div className="text-white/50">
                                {(() => {
                                  // Use Brazil timezone for date calculations
                                  const today = new Date()
                                  const brazilToday = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
                                  brazilToday.setHours(0, 0, 0, 0)
                                  
                                  const targetDate = new Date(dueDate + "T00:00:00")
                                  
                                  const diffTime = targetDate.getTime() - brazilToday.getTime()
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                  
                                  if (diffDays < 0) {
                                    return `Atrasado há ${Math.abs(diffDays)} dia(s)`
                                  } else if (diffDays === 0) {
                                    return "Vence hoje"
                                  } else if (diffDays === 1) {
                                    return "Vence amanhã"
                                  } else {
                                    return `Vence em ${diffDays} dias`
                                  }
                                })()}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1">
                              {savingDueDate && (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-blue-400">Salvando...</span>
                                </>
                              )}
                              {hasUnsavedDate && !savingDueDate && dueDateOption === 'outro' && (
                                <span className="text-yellow-400">Não salvo</span>
                              )}
                              {!hasUnsavedDate && !savingDueDate && dueDate && (
                                <span className="text-green-400">Salvo</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Checklist Section */}
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg transition-all duration-300 hover:border-[#3A3A3C]">
                      {/* Header */}
                      <div className="bg-[#1A1A1C] border-b border-[#2A2A2C] px-3 py-2 rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-[#FF9F0A]" />
                            <label className="text-[12px] font-medium text-white/90">Checklist</label>
                            <span className="text-[10px] text-white/50">
                              ({checklist.filter(item => item.completed).length}/{checklist.length})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3 space-y-3">
                        {/* Add new item */}
                        <div className="flex gap-2">
                          <Input
                            value={newItemContent}
                            onChange={(e) => setNewItemContent(e.target.value)}
                            placeholder="Adicionar item à checklist..."
                            className="flex-1 bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 rounded-md text-sm h-8"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addChecklistItem()
                              }
                            }}
                            disabled={saving}
                          />
                          <Button
                            onClick={addChecklistItem}
                            disabled={!newItemContent.trim() || saving}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#FF9F0A] text-black hover:bg-[#FF9F0A]/90"
                          >
                            {saving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {/* Checklist items */}
                        <div className="space-y-2">
                          {checklist.length === 0 ? (
                            <div className="text-center py-6 text-white/50">
                              <CheckSquare className="h-8 w-8 mx-auto mb-2 text-white/30" />
                              <p className="text-sm">Nenhum item na checklist</p>
                              <p className="text-xs">Adicione um item acima para começar</p>
                            </div>
                          ) : (
                            checklist.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 group">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={(e) => updateChecklistItem(item.id, { completed: e.target.checked })}
                                  className="h-4 w-4 rounded border-[#3A3A3C] bg-[#2A2A2C] text-[#FF9F0A] focus:ring-[#FF9F0A] focus:ring-2 transition-all"
                                />
                                <Input
                                  value={item.content}
                                  onChange={(e) => updateChecklistItem(item.id, { content: e.target.value })}
                                  className={cn(
                                    "flex-1 bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-8",
                                    item.completed 
                                      ? 'text-white/60 line-through' 
                                      : 'text-white/90'
                                  )}
                                />
                                <Button
                                  onClick={() => removeChecklistItem(item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Comments */}
                  <div className="lg:border-l lg:border-[#2E2E30] lg:pl-4 border-t border-[#2E2E30] pt-4 lg:border-t-0 lg:pt-0">
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg h-full flex flex-col">
                      {/* Header */}
                      <div className="bg-[#1A1A1C] border-b border-[#2A2A2C] px-3 py-2 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-white/70" />
                          <span className="text-[12px] font-medium text-white/90">Comentários</span>
                          {commentsCount > 0 && (
                            <span className="text-[10px] text-white/50">({commentsCount})</span>
                          )}
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="flex-1 min-h-[400px] p-3">
                        <OKRTaskComments 
                          taskId={localTask.id}
                          onCommentChange={loadCommentsCount}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-3 lg:px-4 py-3 border-t border-[#2E2E30] bg-[#1C1C1E]">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-9 px-4 text-white/80 hover:bg-white/5 rounded-md"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}