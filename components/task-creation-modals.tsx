"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTaskData } from "./task-data"

interface TaskCreationModalsProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (taskData: { title: string; dueDate?: string; columnId: string; assigneeIds?: string[]; priority?: string }) => void
  columnId: string
}

type RemoteMember = { id: string; name: string | null; email: string | null; avatar_url: string | null }

export function TaskCreationModals({ isOpen, onClose, onComplete, columnId }: TaskCreationModalsProps) {
  const { members: ctxMembers, userId } = useTaskData()
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState<Date>()
  const [priority, setPriority] = useState<string>("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [remoteMembers, setRemoteMembers] = useState<RemoteMember[] | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Carregar membros se necessário
  useEffect(() => {
    let cancel = false
    async function loadMembersIfNeeded() {
      if (!isOpen) return
      // se já temos membros do contexto, não precisa chamar API
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

  // Reset state quando modal abre
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelected(null)
    }
  }, [isOpen])

  const listSource: RemoteMember[] = (ctxMembers?.length ?? 0) > 0 ? (ctxMembers as any) : remoteMembers || []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return listSource
    return listSource.filter((m) => (m.name || m.email || "").toLowerCase().includes(q))
  }, [listSource, query])

  const handleComplete = () => {
    if (!title.trim()) return
    
    onComplete({
      title: title.trim(),
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
      columnId,
      assigneeIds: selected ? [selected] : undefined,
      priority: priority || undefined
    })
    
    // Reset state
    setTitle("")
    setDueDate(undefined)
    setPriority("")
    setQuery("")
    setSelected(null)
    onClose()
  }

  const handleCancel = () => {
    // Reset state
    setTitle("")
    setDueDate(undefined)
    setPriority("")
    setQuery("")
    setSelected(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md bg-[#1A1A1C] border-[#2A2A2C] text-white z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">Nova Tarefa</DialogTitle>
          <DialogDescription className="text-white/60 text-sm text-center">
            Adicione título e prazo para a tarefa
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 p-6">
          
          <div className="space-y-4">
            <Input
              placeholder="Digite o título da tarefa..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleComplete()
                }
                if (e.key === 'Escape') {
                  handleCancel()
                }
              }}
            />

            {/* Data de prazo */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Prazo</label>
              
              {/* Atalhos de data */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    const today = new Date()
                    setDueDate(today)
                  }}
                  className={`text-xs h-8 rounded-md border transition-colors ${
                    dueDate && format(dueDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      ? "bg-green-600 border-green-500 text-white font-semibold" 
                      : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    setDueDate(tomorrow)
                  }}
                  className={`text-xs h-8 rounded-md border transition-colors ${
                    dueDate && format(dueDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
                      ? "bg-green-600 border-green-500 text-white font-semibold" 
                      : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                  }`}
                >
                  Amanhã
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    const dayAfterTomorrow = new Date()
                    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
                    setDueDate(dayAfterTomorrow)
                  }}
                  className={`text-xs h-8 rounded-md border transition-colors ${
                    dueDate && format(dueDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 172800000), 'yyyy-MM-dd')
                      ? "bg-green-600 border-green-500 text-white font-semibold" 
                      : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                  }`}
                >
                  Depois de amanhã
                </button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30]",
                      !dueDate && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecionar data personalizada"}
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
                  className="w-full bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/60"
                >
                  Remover prazo
                </Button>
              )}
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Prioridade</label>
              
              {/* Botões de prioridade */}
              <div className="grid grid-cols-4 gap-2">
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

            {/* Responsável */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Responsável</label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar responsável"
                  className="pl-9 bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 h-9 rounded-md"
                  aria-label="Buscar responsável por nome ou e-mail"
                />
              </div>
              
              {loadingMembers && (ctxMembers?.length ?? 0) === 0 ? (
                <div className="text-sm text-white/70 px-1">Carregando membros...</div>
              ) : (
                <ul role="listbox" aria-label="Selecione o responsável" className="max-h-48 overflow-auto space-y-2">
                  {filtered.length === 0 && <li className="text-sm text-white/70 px-1">Nenhum membro encontrado.</li>}
                  {filtered.map((m) => {
                    const active = selected === m.id
                    const initials = (m.name?.charAt(0) || m.email?.charAt(0) || "U").toUpperCase()
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => setSelected(active ? null : (m.id as string))}
                          className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-md border transition-colors",
                            active ? "border-[#4A4A4A] bg-white/5" : "border-[#2E2E30] hover:bg-white/5",
                          )}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={m.avatar_url || ""} alt={`Avatar de ${m.name || m.email || "membro"}`} />
                            <AvatarFallback className="bg-[#3A3A3C] text-white/80">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-sm text-[#F2F2F7] truncate">{m.name || m.email || "Sem nome"}</div>
                            {m.email && <div className="text-xs text-white/60 truncate">{m.email}</div>}
                          </div>
                          {active && <Check className="h-4 w-4 text-white/80" aria-hidden="true" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="hover:bg-[#2A2A2C] text-white/60"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!title.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Criar Tarefa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}