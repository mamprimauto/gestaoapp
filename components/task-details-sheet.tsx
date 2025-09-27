"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, CheckSquare, Loader2, Plus, Trash2, User } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useTaskData } from "./task-data"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import TaskAttachments from "./task-attachments"

type Status = "pending" | "in-progress" | "done"
type PriorityDB = "low" | "med" | "high" | null

type TaskRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  tag: string | null
  owner: string | null
  due_date: string | null
  status: Status
  priority: PriorityDB
  assignee_id?: string | null
  created_at: string
  updated_at: string
}

type ChecklistItem = {
  id: string
  task_id: string
  user_id: string
  content: string
  done: boolean
  position: number
  created_at: string
  updated_at: string
}

type Member = { id: string; name: string | null; email: string | null; avatar_url: string | null }

function dbToUi(p: PriorityDB): "normal" | "prioridade" | "urgente" {
  if (p === "high") return "urgente"
  if (p === "med") return "prioridade"
  return "normal"
}
function uiToDb(p: "normal" | "prioridade" | "urgente"): "low" | "med" | "high" {
  return p === "urgente" ? "high" : p === "prioridade" ? "med" : "low"
}

function isChecklistMissing(err: any) {
  const msg = String(err?.message || err || "")
  const l = msg.toLowerCase()
  return (
    msg.includes('relation "public.task_checklist" does not exist') ||
    l.includes("could not find the table 'public.task_checklist'") ||
    (l.includes("task_checklist") && l.includes("not") && l.includes("exist"))
  )
}

export default function TaskDetailsSheet({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { toast } = useToast()
  const { userId, updateTask, members: ctxMembers } = useTaskData()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [task, setTask] = useState<TaskRow | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [localDueDate, setLocalDueDate] = useState("")

  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [priorityUI, setPriorityUI] = useState<"normal" | "prioridade" | "urgente">("normal")
  const [due, setDue] = useState<string | null>(null)

  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false)
  const [assigneeQuery, setAssigneeQuery] = useState("")
  const [remoteMembers, setRemoteMembers] = useState<Member[] | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newItem, setNewItem] = useState("")
  const [checklistReady, setChecklistReady] = useState(true)

  // Carrega membros via fallback se o contexto estiver vazio
  useEffect(() => {
    let cancel = false
    async function ensureMembers() {
      if (!open) return
      if ((ctxMembers?.length ?? 0) > 0) return
      setLoadingMembers(true)
      try {
        const res = await fetch("/api/members", { cache: "no-store" })
        const data = res.ok ? ((await res.json()) as Member[]) : []
        if (!cancel) setRemoteMembers(data)
      } catch {
        if (!cancel) setRemoteMembers([])
      } finally {
        if (!cancel) setLoadingMembers(false)
      }
    }
    ensureMembers()
    return () => {
      cancel = true
    }
  }, [open, ctxMembers])

  const allMembers: Member[] = (ctxMembers?.length ?? 0) > 0 ? (ctxMembers as Member[]) : remoteMembers || []

  // Carregar dados ao abrir
  useEffect(() => {
    let active = true
    if (!open || !taskId) return
    setLoading(true)
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: t, error: tErr } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle()
        if (tErr) throw new Error(tErr.message || "Falha ao buscar tarefa")
        if (!t) throw new Error("Tarefa não encontrada")

        if (!active) return
        const tr = t as TaskRow
        setTask(tr)
        setTitle(tr.title === "Nova tarefa" ? "" : tr.title || "")
        setDesc(tr.description === "Descrição breve da tarefa" ? "" : tr.description || "")
        setPriorityUI(dbToUi(tr.priority))
        setDue(tr.due_date)
        setLocalDueDate(tr.due_date || "")
        setAssigneeId(tr.assignee_id ?? null)

        // Carrega checklist se existir
        try {
          const { data: list, error: cErr } = await supabase
            .from("task_checklist")
            .select("*")
            .eq("task_id", taskId)
            .order("position", { ascending: true })
            .order("created_at", { ascending: true })
          if (cErr) throw new Error(cErr.message || "Falha ao carregar checklist")
          if (!active) return
          setItems((list as ChecklistItem[]) || [])
          setChecklistReady(true)
        } catch (e: any) {
          if (isChecklistMissing(e)) {
            setChecklistReady(false)
            setItems([])
          } else {
            setChecklistReady(false)
          }
        }
      } catch (e: any) {
        toast({
          title: "Erro ao abrir tarefa",
          description: e?.message || "Falha inesperada",
          variant: "destructive",
        })
        onOpenChange(false)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [open, taskId, onOpenChange, toast])

  // Atalho Cmd/Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"
      if (isSave) {
        e.preventDefault()
        void saveTask()
      }
    }
    if (open) {
      window.addEventListener("keydown", onKey)
      return () => window.removeEventListener("keydown", onKey)
    }
  }, [open, title, desc, due, priorityUI, assigneeId, task])

  const priorityMeta = useMemo(() => {
    if (priorityUI === "urgente") return { label: "Urgente", color: "#FF453A" }
    if (priorityUI === "prioridade") return { label: "Prioridade", color: "#FFD60A" }
    return { label: "Normal", color: "#8E8E93" }
  }, [priorityUI])

  const assignee = useMemo(() => {
    if (!assigneeId) return null
    return allMembers.find((m) => m.id === assigneeId) || null
  }, [assigneeId, allMembers])

  async function saveTask() {
    if (!task) return
    setSaving(true)
    try {
      const updated = await updateTask(task.id, {
        title: title.trim() || "Sem título",
        description: desc.trim() ? desc.trim() : null,
        due_date: due,
        priority: uiToDb(priorityUI),
        assignee_id: assigneeId ?? null,
      } as Partial<TaskRow>)
      if (updated) setTask(updated as any)
      toast({ title: "Tarefa atualizada" })
      onOpenChange(false)
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Falha inesperada",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Checklist CRUD
  async function addChecklistItem() {
    if (!task || !userId) return
    if (!checklistReady) {
      toast({
        title: "Checklist indisponível",
        description: 'Execute a migration "scripts/db/010_task_checklist.sql" no Supabase.',
      })
      return
    }
    const content = newItem.trim()
    if (!content) return
    try {
      const supabase = await getSupabaseClient()
      const position = (items[items.length - 1]?.position || 0) + 1
      const { data, error } = await supabase
        .from("task_checklist")
        .insert({
          task_id: task.id,
          user_id: userId,
          content,
          done: false,
          position,
        })
        .select("*")
        .single()
      if (error) throw new Error(error.message || "Falha ao adicionar item")
      setItems((prev) => [...prev, data as ChecklistItem])
      setNewItem("")
    } catch (e: any) {
      if (isChecklistMissing(e)) {
        setChecklistReady(false)
        toast({
          title: "Checklist indisponível",
          description: 'Execute a migration "scripts/db/010_task_checklist.sql" no Supabase.',
        })
        return
      }
      toast({
        title: "Erro ao adicionar item",
        description: e?.message || "Falha inesperada",
        variant: "destructive",
      })
    }
  }

  async function toggleItem(id: string, done: boolean) {
    if (!checklistReady) {
      toast({
        title: "Checklist indisponível",
        description: 'Execute a migration "scripts/db/010_task_checklist.sql" no Supabase.',
      })
      return
    }
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.from("task_checklist").update({ done }).eq("id", id).select("*").single()
      if (error) throw new Error(error.message || "Falha ao atualizar item")
      setItems((prev) => prev.map((i) => (i.id === id ? (data as ChecklistItem) : i)))
    } catch (e: any) {
      if (isChecklistMissing(e)) {
        setChecklistReady(false)
        toast({
          title: "Checklist indisponível",
          description: 'Execute a migration "scripts/db/010_task_checklist.sql" no Supabase.',
        })
        return
      }
      toast({
        title: "Erro ao atualizar item",
        description: e?.message || "Falha inesperada",
        variant: "destructive",
      })
    }
  }

  async function removeItem(id: string) {
    if (!checklistReady) {
      toast({
        title: "Checklist indisponível",
        description: 'Execute a migration "scripts/db/010_task_checklist.sql" no Supabase.',
      })
      return
    }
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase.from("task_checklist").delete().eq("id", id)
      if (error) throw new Error(error.message || "Falha ao remover item")
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (e: any) {
      if (isChecklistMissing(e)) {
        setChecklistReady(false)
        toast({
          title: "Checklist indisponível",
          description: 'Execute a migration "scripts/db/010_task_checklist.sql" no Supabase.',
        })
        return
      }
      toast({
        title: "Erro ao remover item",
        description: e?.message || "Falha inesperada",
        variant: "destructive",
      })
    }
  }

  // Filtro de busca de membros
  const filteredMembers = useMemo(() => {
    const q = assigneeQuery.trim().toLowerCase()
    if (!q) return allMembers
    return allMembers.filter((m) => (m.name || m.email || "").toLowerCase().includes(q))
  }, [assigneeQuery, allMembers])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <DialogContent className="max-w-[92vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C] rounded-xl p-0 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-4 py-3 border-b border-[#2E2E30]">
          <DialogHeader>
            <DialogTitle className="text-[#F2F2F7] flex items-center gap-2 text-[15px]">
              <CheckSquare className="h-4 w-4 text-white/70" />
              Detalhes da Tarefa
            </DialogTitle>
            <DialogDescription className="text-white/65 text-[12px]">
              Edite as informações rapidamente e marque o progresso.
            </DialogDescription>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin mr-2 inline" />
            Carregando...
          </div>
        ) : task ? (
          <>
            {/* Corpo - Layout responsivo */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 p-3 lg:p-4">
                
                {/* Coluna Esquerda - Informações Principais */}
                <div className="space-y-2 lg:space-y-3">
                  {/* Linha: Prioridade + Prazo */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    className="rounded-full bg-transparent border text-[12px] h-6"
                    style={{ borderColor: priorityMeta.color, color: priorityMeta.color }}
                  >
                    {priorityMeta.label}
                  </Badge>

                  <div className="ml-1 rounded-lg bg-[#232325] border border-[#303033] p-1 inline-flex">
                    {(["normal", "prioridade", "urgente"] as const).map((key) => {
                      const isActive = priorityUI === key
                      const activeStyles =
                        key === "urgente"
                          ? "text-[#FF453A] bg-[#FF453A]/15 border-[#FF453A]/30"
                          : key === "prioridade"
                            ? "text-[#FFD60A] bg-[#FFD60A]/15 border-[#FFD60A]/30"
                            : "text-[#8E8E93] bg-[#8E8E93]/15 border-[#8E8E93]/30"
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPriorityUI(key)}
                          className={cn(
                            "px-3 h-8 rounded-md border text-[12px] transition-colors",
                            isActive ? activeStyles : "text-white/75 border-transparent hover:bg-white/5",
                          )}
                          aria-pressed={isActive}
                        >
                          {key === "normal" ? "Normal" : key === "prioridade" ? "Prioridade" : "Urgente"}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70 inline-flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4 text-white/60" />
                    Prazo
                  </span>
                  {showDatePicker ? (
                    <div className="space-y-2 w-[11rem]">
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={localDueDate}
                        onChange={(e) => {

                          const newDate = e.target.value || null
                          setLocalDueDate(e.target.value || "")
                          setDue(newDate)

                          setShowDatePicker(false)
                        }}
                        onBlur={() => {

                          setTimeout(() => setShowDatePicker(false), 200) // Small delay to allow for selection
                        }}
                        className="w-full h-8 bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md px-3"
                        autoFocus
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {

                          setShowDatePicker(false)
                        }}
                        className="w-full h-6 text-xs bg-transparent border-[#3A3A3C] text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()

                        setShowDatePicker(true)
                        // Also try to programmatically open
                        setTimeout(() => {
                          if (dateInputRef.current) {

                            try {
                              if ('showPicker' in dateInputRef.current) {

                                ;(dateInputRef.current as any).showPicker()
                              } else {

                                dateInputRef.current.focus()
                                dateInputRef.current.click()
                              }
                            } catch (error) {

                            }
                          }
                        }, 100)
                      }}
                      className={cn(
                        "h-8 w-[11rem] justify-start text-left font-normal bg-[#2A2A2C] border-[#3A3A3C] text-white hover:bg-[#333335] hover:border-[#444447]",
                        !localDueDate && "text-white/40"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localDueDate ? format(new Date(localDueDate + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  )}
                </div>
              </div>

                  {/* Responsável */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13px] text-white/80">Responsável</label>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={assignee?.avatar_url || "/minimal-avatar.png"} alt="Avatar do responsável" />
                        <AvatarFallback className="bg-[#3A3A3C] text-white/80">
                          {(assignee?.name?.[0] || assignee?.email?.[0] || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm text-white/90 flex-1 min-w-0 truncate">
                        {assignee ? assignee.name || assignee.email : "Sem responsável"}
                      </div>
                      <Button
                        type="button"
                        onClick={() => setAssigneePickerOpen((v) => !v)}
                        className="h-8 px-3 rounded-md bg-[#2A2A2C] border border-[#3A3A3C] text-white/85 hover:bg-white/5"
                      >
                        <User className="h-4 w-4 mr-2" />
                        {assignee ? "Trocar" : "Escolher"}
                      </Button>
                    </div>

                    {assigneePickerOpen && (
                      <div className="mt-2 rounded-md border border-[#2E2E30] bg-[#1F1F21] p-2">
                        <Input
                          value={assigneeQuery}
                          onChange={(e) => setAssigneeQuery(e.target.value)}
                          placeholder="Buscar membro"
                          className="h-8 bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40"
                        />
                        <div className="max-h-32 overflow-auto mt-2">
                          {loadingMembers && (ctxMembers?.length ?? 0) === 0 ? (
                            <div className="text-sm text-white/70 px-1 py-2">Carregando membros...</div>
                          ) : filteredMembers.length === 0 ? (
                            <div className="text-sm text-white/70 px-1 py-2">Nenhum membro encontrado.</div>
                          ) : (
                            <ul className="space-y-1">
                              {filteredMembers.map((m) => {
                                const active = assigneeId === m.id
                                const initials = (m.name?.[0] || m.email?.[0] || "U").toUpperCase()
                                return (
                                  <li key={m.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssigneeId(active ? null : m.id)
                                        setAssigneePickerOpen(false)
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-2 py-2 rounded-md border transition-colors text-left",
                                        active ? "border-[#4A4A4A] bg-white/5" : "border-[#2E2E30] hover:bg-white/5",
                                      )}
                                    >
                                      <Avatar className="h-7 w-7">
                                        <AvatarImage
                                          src={m.avatar_url || ""}
                                          alt={`Avatar de ${m.name || m.email || "membro"}`}
                                        />
                                        <AvatarFallback className="bg-[#3A3A3C] text-white/80">{initials}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-[#F2F2F7] truncate">
                                          {m.name || m.email || "Sem nome"}
                                        </div>
                                        {m.email && <div className="text-xs text-white/60 truncate">{m.email}</div>}
                                      </div>
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Título */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13px] text-white/80" htmlFor="task-title">
                      Título
                    </label>
                    <Input
                      id="task-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nova tarefa"
                      className="w-full bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 h-9 rounded-md"
                    />
                  </div>

                  {/* Descrição */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13px] text-white/80" htmlFor="task-desc">
                      Descrição
                    </label>
                    <textarea
                      id="task-desc"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows={3}
                      className="block w-full min-h-[80px] bg-[#2A2A2C] border border-[#3A3A3C] text-white placeholder:text-white/40 rounded-md p-2 resize-y"
                      placeholder="Descrição breve da tarefa"
                    />
                  </div>
                </div>

                {/* Coluna Direita - Checklist e Anexos */}
                <div className="space-y-2 lg:space-y-3 lg:border-l lg:border-[#2E2E30] lg:pl-4">

                  {/* Checklist */}
                  <div className="space-y-2">
                    <div className="text-[13px] text-white/80">Checklist</div>

                    {!checklistReady && (
                      <div className="text-xs text-white/65 rounded-md border border-[#53420d] bg-[#2a2509] p-3">
                        Checklist desativado: ative executando a migration scripts/db/010_task_checklist.sql no Supabase.
                      </div>
                    )}

                    {checklistReady && (
                      <>
                        {items.length === 0 && (
                          <div className="text-xs text-white/60">Sem itens ainda. Adicione o primeiro abaixo.</div>
                        )}
                        <div className="max-h-48 overflow-y-auto">
                          <ul className="grid gap-2">
                            {items.map((it) => (
                              <li
                                key={it.id}
                                className="flex items-center gap-2 rounded-md border border-[#2E2E30] bg-[#1F1F21] px-3 py-2"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[#30D158]"
                                  checked={it.done}
                                  onChange={(e) => toggleItem(it.id, e.target.checked)}
                                  aria-label={it.done ? "Marcar como não feito" : "Marcar como feito"}
                                />
                                <span className={cn("flex-1 text-sm", it.done && "line-through text-white/50")}>
                                  {it.content}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/5"
                                  onClick={() => removeItem(it.id)}
                                  aria-label="Remover item"
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            placeholder="Novo item de checklist"
                            className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 h-9 rounded-md"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                void addChecklistItem()
                              }
                            }}
                          />
                          <Button
                            onClick={addChecklistItem}
                            className="h-8 w-8 p-0 rounded-md bg-[#2A2A2C] text-white/80 hover:bg-[#2A2A2C]/80 border border-[#2E2E30]"
                            type="button"
                            variant="ghost"
                            aria-label="Adicionar item"
                            title="Adicionar item"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Anexos */}
                  <div className="space-y-2">
                    <TaskAttachments taskId={task.id} />
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="px-3 lg:px-4 py-3 border-t border-[#2E2E30] flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-9 px-3 text-white/80 hover:bg-white/5 rounded-md"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveTask}
                disabled={saving}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-md h-9 px-4"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-white/60">Selecione uma tarefa.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
