"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTaskData } from "./task-data"
import { Loader2, Send, CalendarIcon, Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Workspace } from "@/app/tarefas/page"

type RemoteMember = { id: string; name: string | null; email: string | null; avatar_url: string | null }

interface CrossDepartmentModalProps {
  isOpen: boolean
  onClose: () => void
  workspaces: Workspace[]
  currentUserRole: string | null
}


// Mapear workspaces para departamentos com nomes corretos
const getDepartmentInfo = (workspace: Workspace) => {
  const departmentMap: Record<string, { name: string; tag: string; icon: string; color: string }> = {
    'copy': { name: 'Copy', tag: 'copy', icon: '✍️', color: '#FF6B35' },
    'trafego': { name: 'Gestão de Tráfego', tag: 'trafego', icon: '📊', color: '#7C3AED' },
    'edicao': { name: 'Editores', tag: 'edicao', icon: '🎬', color: '#10B981' },
    'igor': { name: 'Área do Igor', tag: 'igor', icon: '👤', color: '#06B6D4' },
    'italo': { name: 'Área do Italo', tag: 'italo', icon: '👤', color: '#F59E0B' }
  }
  
  return departmentMap[workspace.id] || { name: workspace.name, tag: workspace.id, icon: workspace.icon, color: workspace.color }
}

export default function CrossDepartmentModal({
  isOpen,
  onClose,
  workspaces,
  currentUserRole
}: CrossDepartmentModalProps) {
  const { createLinkedTasks, members: ctxMembers } = useTaskData()
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState<Date>()
  const [priority, setPriority] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [remoteMembers, setRemoteMembers] = useState<RemoteMember[] | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Carregar role do usuário quando modal abre
  useEffect(() => {
    let cancel = false
    async function loadUserRole() {
      if (!isOpen || userRole) return
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && !cancel) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
          
          if (profile && !cancel) {
            setUserRole(profile.role)
          }
        }
      } catch (error) {
        console.error("Error loading user role:", error)
      }
    }
    loadUserRole()
    return () => {
      cancel = true
    }
  }, [isOpen, userRole])

  // Carregar membros quando modal abre
  useEffect(() => {
    let cancel = false
    async function loadMembersIfNeeded() {
      if (!isOpen) return
      if ((ctxMembers?.length ?? 0) > 0) return
      setLoadingMembers(true)
      try {
        const res = await fetch("/api/members", { cache: "no-store" })
        if (!res.ok) throw new Error("Falha ao carregar membros")
        const data = (await res.json()) as RemoteMember[]
        if (!cancel) setRemoteMembers(data)
      } catch (e) {
        if (!cancel) setRemoteMembers([])
      } finally {
        if (!cancel) setLoadingMembers(false)
      }
    }
    loadMembersIfNeeded()
    return () => {
      cancel = true
    }
  }, [isOpen, ctxMembers])

  const listSource: RemoteMember[] = (ctxMembers?.length ?? 0) > 0 ? (ctxMembers as any) : remoteMembers || []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return listSource
    return listSource.filter((m) => (m.name || m.email || "").toLowerCase().includes(q))
  }, [listSource, query])

  // Função para navegar entre os passos
  const handleNext = () => {
    if (step === 1 && selectedDepartment) {
      setStep(2)
    } else if (step === 2) {
      handleCreateRequest()
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  // Função para criar tarefas linkadas
  const handleCreateRequest = async () => {
    if (!title.trim() || !selectedDepartment) return
    
    setCreating(true)
    try {
      const targetWorkspace = workspaces.find(w => w.id === selectedDepartment)
      if (!targetWorkspace) throw new Error("Departamento não encontrado")

      const departmentInfo = getDepartmentInfo(targetWorkspace)
      
      // Capturar o resultado da criação das tarefas
      const result = await createLinkedTasks({
        targetDepartment: departmentInfo.tag,
        targetDepartmentName: departmentInfo.name,
        title: title.trim(),
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        assigneeIds: selectedResponsibles,
        priority: priority || undefined
      })

      toast({
        title: "Solicitação enviada!",
        description: `Tarefa "${title.trim()}" criada na caixa de entrada de ${departmentInfo.name}.`,
      })

      // Limpar o modal
      onClose()
      setTitle("")
      setDueDate(undefined)
      setPriority("")
      setSelectedDepartment(null)
      setSelectedResponsibles([])
      setQuery("")
      setStep(1)

      // Redirecionar para o departamento do usuário e abrir a tarefa criada
      const roleToUse = userRole || currentUserRole
      
      if (roleToUse && result.sentTask) {
        // Mapear role do usuário para workspace ID
        let userWorkspaceId = roleToUse === 'copy' ? 'copy' :
                              roleToUse === 'trafego' ? 'trafego' : 
                              roleToUse === 'edicao' ? 'edicao' :
                              roleToUse === 'igor' ? 'igor' :
                              roleToUse === 'italo' ? 'italo' : null

        // Se for admin, usar workspace favorito ou igor como fallback
        if (roleToUse === 'admin') {
          const favoriteWorkspace = localStorage.getItem('favoriteWorkspace')
          userWorkspaceId = favoriteWorkspace || 'igor' // Igor como fallback para admin
        }

        if (userWorkspaceId) {
          // Redirecionar para o departamento do usuário com o ID da tarefa para abrir
          const redirectUrl = `/?workspace=${userWorkspaceId}&openTask=${result.sentTask.id}`
          
          // Usar window.location.href para forçar reload completo da página
          setTimeout(() => {
            window.location.href = redirectUrl
          }, 100)
        } else {
          // Fallback: redirecionar para o workspace favorito ou tarefas gerais
          const favoriteWorkspace = localStorage.getItem('favoriteWorkspace')
          if (favoriteWorkspace) {
            const redirectUrl = `/?workspace=${favoriteWorkspace}&openTask=${result.sentTask.id}`
            setTimeout(() => {
              window.location.href = redirectUrl
            }, 100)
          } else {
            const redirectUrl = `/?openTask=${result.sentTask.id}`
            setTimeout(() => {
              window.location.href = redirectUrl
            }, 100)
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar solicitação",
        description: error.message || "Falha inesperada",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-md max-w-[92vw] bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C] rounded-xl p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2E2E30]">
          <DialogHeader>
            <DialogTitle className="text-[#F2F2F7] text-[15px] flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-400" />
              Solicitar Tarefa
            </DialogTitle>
            <DialogDescription className="text-white/70 text-[12px]">
              {step === 1 
                ? "Escolha o departamento de destino."
                : "Adicione título, prazo e responsável."
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Step 1: Seleção de departamento */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="text-sm text-white/70">Departamento de destino</label>
              <div className="grid gap-2 max-h-64 overflow-auto">
                {workspaces.map((workspace) => {
                  const departmentInfo = getDepartmentInfo(workspace)
                  const active = selectedDepartment === workspace.id
                  
                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() => setSelectedDepartment(active ? null : workspace.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-md border transition-colors text-left",
                        active ? "border-blue-500 bg-blue-500/10" : "border-[#2E2E30] hover:bg-white/5",
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback 
                          className="text-lg"
                          style={{ 
                            backgroundColor: departmentInfo.color + '30',
                            color: departmentInfo.color
                          }}
                        >
                          {departmentInfo.icon}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#F2F2F7] font-medium">{departmentInfo.name}</div>
                        <div className="text-xs text-white/60">{departmentInfo.tag}</div>
                      </div>
                      
                      {active && <Check className="h-4 w-4 text-blue-400" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Título, prazo e responsável */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Preview do departamento selecionado */}
              <div className="bg-[#2A2A2C] rounded-lg p-3">
                <div className="text-xs text-white/60 mb-2">Departamento selecionado:</div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const workspace = workspaces.find(w => w.id === selectedDepartment)
                    if (!workspace) return null
                    const departmentInfo = getDepartmentInfo(workspace)
                    return (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback 
                            className="text-sm"
                            style={{ 
                              backgroundColor: departmentInfo.color + '30',
                              color: departmentInfo.color
                            }}
                          >
                            {departmentInfo.icon}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white/90">{departmentInfo.name}</span>
                      </>
                    )
                  })()}
                </div>
              </div>

              <Input
                placeholder="Digite o título da solicitação..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim()) {
                    handleCreateRequest()
                  }
                  if (e.key === 'Escape') {
                    handleBack()
                  }
                }}
              />

              {/* Data de prazo - Compacta */}
              <div className="space-y-2">
                <label className="text-sm text-white/70">Prazo (opcional)</label>
                
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const today = new Date()
                      setDueDate(today)
                    }}
                    className="text-xs bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80 h-8"
                  >
                    Hoje
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setDueDate(tomorrow)
                    }}
                    className="text-xs bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80 h-8"
                  >
                    Amanhã
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const dayAfterTomorrow = new Date()
                      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
                      setDueDate(dayAfterTomorrow)
                    }}
                    className="text-xs bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80 h-8"
                  >
                    +2 dias
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] h-8",
                          !dueDate && "text-white/40"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dueDate ? format(dueDate, "dd/MM", { locale: ptBR }) : "Data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#1A1A1C] border-[#2A2A2C] z-[10000]" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        className="bg-[#1A1A1C] text-white"
                      />
                    </PopoverContent>
                  </Popover>
                  {dueDate && (
                    <Button
                      variant="outline"
                      onClick={() => setDueDate(undefined)}
                      className="bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/60 h-8 px-3"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>

              {/* Prioridade */}
              <div className="space-y-2">
                <label className="text-sm text-white/70">Prioridade</label>
                
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setPriority("")
                    }}
                    className={`text-xs h-8 rounded-md border transition-colors ${
                      priority === "" 
                        ? "bg-gray-600 border-gray-500 text-white font-semibold" 
                        : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                    }`}
                  >
                    Sem
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setPriority("low")
                    }}
                    className={`text-xs h-8 rounded-md border transition-colors ${
                      priority === "low" 
                        ? "bg-blue-600 border-blue-500 text-white font-semibold" 
                        : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                    }`}
                  >
                    Baixa
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setPriority("med")
                    }}
                    className={`text-xs h-8 rounded-md border transition-colors ${
                      priority === "med" 
                        ? "bg-yellow-600 border-yellow-500 text-white font-semibold" 
                        : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                    }`}
                  >
                    Média
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setPriority("high")
                    }}
                    className={`text-xs h-8 rounded-md border transition-colors ${
                      priority === "high" 
                        ? "bg-red-600 border-red-500 text-white font-semibold" 
                        : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                    }`}
                  >
                    Alta
                  </button>
                </div>
              </div>

              {/* Seleção de responsável - Compacta */}
              <div className="space-y-2">
                <label className="text-sm text-white/70">Responsável (opcional)</label>
                
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/50" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="pl-7 bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 h-8 text-sm"
                  />
                </div>

                {loadingMembers && (ctxMembers?.length ?? 0) === 0 ? (
                  <div className="text-xs text-white/70 px-1">Carregando...</div>
                ) : (
                  <div className="max-h-20 overflow-auto space-y-1">
                    {filtered.length === 0 && <div className="text-xs text-white/70 px-1">Nenhum membro encontrado.</div>}
                    {filtered.slice(0, 6).map((m) => {
                      const active = selectedResponsibles.includes(m.id)
                      const initials = (m.name?.charAt(0) || m.email?.charAt(0) || "U").toUpperCase()
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setSelectedResponsibles(prev => prev.filter(id => id !== m.id))
                            } else {
                              setSelectedResponsibles([m.id]) // Apenas um selecionado
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1 rounded border transition-colors text-left",
                            active ? "border-blue-500 bg-blue-500/10" : "border-[#2E2E30] hover:bg-white/5",
                          )}
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={m.avatar_url || "/minimal-avatar.png"} />
                            <AvatarFallback className="bg-[#3A3A3C] text-white/80 text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#F2F2F7] truncate">{m.name || m.email || "Sem nome"}</div>
                          </div>
                          {active && <Check className="h-3 w-3 text-blue-400" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {selectedResponsibles.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-[#2A2A2C] border border-[#3A3A3C] rounded">
                    <span className="text-xs text-white/70">{selectedResponsibles.length} selecionado</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedResponsibles([])}
                      className="h-5 px-2 text-xs text-white/60 hover:text-white"
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#2E2E30] flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : handleBack}
            className="h-9 px-3 text-white/80 hover:bg-white/5 rounded-md"
          >
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              (step === 1 && !selectedDepartment) ||
              (step === 2 && (!title.trim() || creating))
            }
            className="bg-blue-600 text-white hover:bg-blue-700 rounded-md h-9 px-4"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                Criando...
              </>
            ) : step === 2 ? (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Solicitação
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}