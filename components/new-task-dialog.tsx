"use client"
import { useEffect, useMemo, useState } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { departmentToTag, type Department } from "@/lib/departments"
import { useTaskData } from "./task-data"
import { Check, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
type RemoteMember = { id: string; name: string | null; email: string | null; avatar_url: string | null }
export default function NewTaskDialog({
  open,
  onOpenChange,
  department,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  department: Department
  onCreated?: (id: string) => void
}) {
  const { members: ctxMembers, addTask, userId } = useTaskData()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState<string>("")
  const [remoteMembers, setRemoteMembers] = useState<RemoteMember[] | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  // Fallback: busca via API com Service Role quando o contexto não tem membros
  useEffect(() => {
    let cancel = false
    async function loadMembersIfNeeded() {
      if (!open) return
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
  }, [open, ctxMembers])
  useEffect(() => {
    if (open) {
      setQuery("")
      setTitle("")
      setDueDate("")
      setPriority("") // Sem prioridade por padrão
      // Pré-seleciona o próprio usuário em "Particular"
      if (department === "particular" && userId) setSelected(userId)
      else setSelected(null)
    }
  }, [open, department, userId])
  const listSource: RemoteMember[] = (ctxMembers?.length ?? 0) > 0 ? (ctxMembers as any) : remoteMembers || []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return listSource
    return listSource.filter((m) => (m.name || m.email || "").toLowerCase().includes(q))
  }, [listSource, query])
  async function create() {
    if (creating) return
    setCreating(true)
    try {
      const assignee_id = selected ?? (department === "particular" ? (userId ?? null) : null)
      const init: any = { 
        assignee_id,
        title: title.trim() || "Nova tarefa",
        due_date: dueDate || null,
        priority: priority || null
      }
      if (department !== "particular") {
        init.tag = departmentToTag(department as any)
      }
      const created = await addTask(init)
      if (created?.id) {
        onOpenChange(false)
        onCreated?.(created.id)
      }
    } finally {
      setCreating(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-md max-w-[92vw] bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C] rounded-xl p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2E2E30]">
          <DialogHeader>
            <DialogTitle className="text-[#F2F2F7] text-[15px]">Nova Tarefa</DialogTitle>
            <DialogDescription className="text-white/70 text-[12px]">
              Preencha os dados da tarefa e escolha o responsável.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 h-9 rounded-md"
              aria-label="Título da tarefa"
            />
          </div>
          <div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 h-9 rounded-md"
              aria-label="Data de entrega"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white/70">Prioridade</label>
            
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setPriority("")
                }}
                className={`text-xs h-9 rounded-md border transition-colors ${
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
                className={`text-xs h-9 rounded-md border transition-colors ${
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
                className={`text-xs h-9 rounded-md border transition-colors ${
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
                className={`text-xs h-9 rounded-md border transition-colors ${
                  priority === "high" 
                    ? "bg-red-600 border-red-500 text-white font-semibold" 
                    : "bg-[#2A2A2C] border-[#3A3A3C] hover:bg-[#2E2E30] text-white/80"
                }`}
              >
                Alta
              </button>
            </div>
          </div>
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
            <ul role="listbox" aria-label="Selecione o responsável" className="max-h-64 overflow-auto space-y-2">
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
        <div className="px-4 py-3 border-t border-[#2E2E30] flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 px-3 text-white/80 hover:bg-white/5 rounded-md"
          >
            Cancelar
          </Button>
          <Button
            onClick={create}
            disabled={creating}
            className="bg-blue-600 text-white hover:bg-blue-700 rounded-md h-9 px-4"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...
              </>
            ) : (
              "Criar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
