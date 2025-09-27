"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { useTaskData } from "./task-data"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TaskDetailsSheet from "./task-details-sheet"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Trash2, Plus, Filter, Calendar, User, Flag, Palette } from "lucide-react"
import { isTaskInDepartment, departmentToTag, type Department } from "@/lib/departments"

type Priority = "low" | "med" | "high" | null
type StatusFilter = "all" | "pending" | "in-progress" | "done"
type PriorityFilter = "all" | "low" | "med" | "high"

function priorityRank(p: Priority) {
  return p === "high" ? 0 : p === "med" ? 1 : 2
}

function dueRank(due: string | null) {
  if (!due) return Number.POSITIVE_INFINITY
  const ts = Date.parse(due + "T00:00:00")
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY
  return ts
}

export default function CreativeListView() {
  const { tasks, loading, toggleStatus, deleteTask, members, userId, addTask } = useTaskData()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [tab, setTab] = useState<"ativas" | "completas">("ativas")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string | null; avatar_url: string | null; email: string | null }>()
    for (const m of members) map.set(m.id, { name: m.name, avatar_url: m.avatar_url, email: m.email })
    return map
  }, [members])

  const filteredSorted = useMemo(() => {
    const base = tasks.filter((t) => isTaskInDepartment(t as any, "criativos", userId))
    
    // Apply filters
    let filtered = base
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter)
    }
    
    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }
    
    if (assigneeFilter !== "all") {
      filtered = filtered.filter((t) => t.assignee_id === assigneeFilter)
    }

    return [...filtered].sort((a, b) => {
      const byPriority = priorityRank(a.priority) - priorityRank(b.priority)
      if (byPriority !== 0) return byPriority
      const byDue = dueRank(a.due_date) - dueRank(b.due_date)
      if (byDue !== 0) return byDue
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [tasks, userId, statusFilter, priorityFilter, assigneeFilter])

  const activeTasks = useMemo(() => filteredSorted.filter((t) => t.status !== "done"), [filteredSorted])
  const completedTasks = useMemo(() => filteredSorted.filter((t) => t.status === "done"), [filteredSorted])

  async function onToggle(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setSavingId(id)
    await toggleStatus(id)
    setSavingId(null)
  }

  async function handleCreate() {
    const init: any = {}
    init.tag = departmentToTag("criativos")
    const created = await addTask(init)
    if (created?.id) {
      setOpenId(created.id)
    }
  }

  const clearFilters = () => {
    setStatusFilter("all")
    setPriorityFilter("all") 
    setAssigneeFilter("all")
  }

  const hasFilters = statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all"

  return (
    <>
      {/* Header com filtros estilo Monday/ClickUp */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-white/70" />
          <span className="text-sm font-medium text-white/90">Filtros:</span>
          
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px] bg-[#2C2C2E] border-[#3A3A3C]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in-progress">Em Progresso</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
            <SelectTrigger className="w-[140px] bg-[#2C2C2E] border-[#3A3A3C]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Urgente</SelectItem>
              <SelectItem value="med">Prioridade</SelectItem>
              <SelectItem value="low">Normal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px] bg-[#2C2C2E] border-[#3A3A3C]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="border-[#3A3A3C] hover:bg-[#3A3A3C]">
              Limpar
            </Button>
          )}
        </div>

        <div className="ml-auto">
          <Button
            className="bg-[#FFD60A] text-black hover:bg-[#ffd60a]/90 rounded-xl"
            onClick={handleCreate}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa Criativa
          </Button>
        </div>
      </div>

      {/* Lista principal estilo Monday/ClickUp */}
      <div className="rounded-2xl border border-[#3A3A3C] bg-[#1F1F1F] overflow-hidden">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          {/* Header da tabela */}
          <div className="border-b border-[#3A3A3C] px-6 py-4">
            <TabsList className="bg-[#2C2C2E] text-white/80">
              <TabsTrigger value="ativas">Ativas ({activeTasks.length})</TabsTrigger>
              <TabsTrigger value="completas">Completas ({completedTasks.length})</TabsTrigger>
            </TabsList>
          </div>

          {/* Cabeçalhos das colunas */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-white/60 bg-[#2C2C2E] border-b border-[#3A3A3C] relative pr-20">
            <div className="col-span-1"></div>
            <div className="col-span-4 flex items-center gap-2">
              <Flag className="h-3 w-3" />
              TAREFA
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <User className="h-3 w-3" />
              RESPONSÁVEL
            </div>
            <div className="col-span-2 flex items-center gap-2 justify-center">STATUS</div>
            <div className="col-span-2 flex items-center gap-2 justify-center">
              <Calendar className="h-3 w-3" />
              PRAZO
            </div>
            {/* Cabeçalho de Ações fora do grid */}
            <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white/60">
              AÇÕES
            </div>
          </div>

          <TabsContent value="ativas" className="m-0">
            <div className="divide-y divide-[#3A3A3C]">
              {loading && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-6 py-4 animate-pulse">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                          <div className="h-4 w-4 bg-[#3A3A3C] rounded-full" />
                        </div>
                        <div className="col-span-4">
                          <div className="h-4 w-3/4 bg-[#3A3A3C] rounded mb-2" />
                          <div className="h-3 w-1/2 bg-[#3A3A3C] rounded" />
                        </div>
                        <div className="col-span-2">
                          <div className="h-8 w-8 bg-[#3A3A3C] rounded-full" />
                        </div>
                        <div className="col-span-2">
                          <div className="h-6 w-20 bg-[#3A3A3C] rounded-full" />
                        </div>
                        <div className="col-span-2">
                          <div className="h-3 w-16 bg-[#3A3A3C] rounded" />
                        </div>
                        <div className="col-span-1">
                          <div className="h-4 w-4 bg-[#3A3A3C] rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {!loading && activeTasks.length === 0 && (
                <div className="px-6 py-12 text-center text-white/70">
                  <Palette className="h-12 w-12 mx-auto mb-4 text-white/40" />
                  <p className="text-lg font-medium mb-2">Nenhuma tarefa criativa encontrada</p>
                  <p className="text-sm">Crie sua primeira tarefa para começar!</p>
                </div>
              )}
              {!loading &&
                activeTasks.map((t) => {
                  const m = t.assignee_id ? memberMap.get(t.assignee_id) : null
                  return (
                    <div
                      key={t.id}
                      className="px-6 py-4 min-h-[56px] hover:bg-[#2C2C2E] transition-colors cursor-pointer group relative"
                      onClick={() => setOpenId(t.id)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pr-20">
                        {/* Checkbox */}
                        <div className="hidden md:block md:col-span-1">
                          <button
                            onClick={(e) => onToggle(e, t.id)}
                            disabled={savingId === t.id}
                            className={cn(
                              "h-5 w-5 rounded-full border-2 transition-all hover:scale-110",
                              t.status === "done" ? "bg-[#30D158] border-[#30D158]" : "border-[#4A4A4A] hover:border-[#6A6A6A]",
                              savingId === t.id && "opacity-70 animate-pulse",
                            )}
                          />
                        </div>

                        {/* Tarefa */}
                        <div className="col-span-1 md:col-span-4">
                          <div className="flex items-start gap-3 md:hidden">
                            <button
                              onClick={(e) => onToggle(e, t.id)}
                              disabled={savingId === t.id}
                              className={cn(
                                "mt-1 h-4 w-4 rounded-full border-2 transition-all",
                                t.status === "done" ? "bg-[#30D158] border-[#30D158]" : "border-[#4A4A4A]",
                                savingId === t.id && "opacity-70",
                              )}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div 
                                  className="font-medium text-[#F2F2F7] whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 cursor-help" 
                                  title={t.title}
                                >
                                  {t.title}
                                </div>
                                <PriorityBadge priority={t.priority} />
                              </div>
                              {t.description && <p className="text-sm text-white/75 line-clamp-2 mb-2">{t.description}</p>}
                              <div className="flex items-center justify-between text-xs text-white/60">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={m?.avatar_url || "/minimal-avatar.png"} />
                                    <AvatarFallback className="bg-[#3A3A3C] text-[10px]">
                                      {(m?.name?.[0] || m?.email?.[0] || "U").toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{m?.name || "—"}</span>
                                </div>
                                <span>
                                  {t.due_date ? new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "Sem prazo"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="hidden md:block">
                            <div className="flex items-center gap-3 mb-2">
                              <div 
                                className="font-medium text-[#F2F2F7] whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 cursor-help" 
                                title={t.title}
                              >
                                {t.title}
                              </div>
                              <PriorityBadge priority={t.priority} className="flex-shrink-0" />
                            </div>
                            {t.description && <p className="text-sm text-white/75 line-clamp-1">{t.description}</p>}
                          </div>
                        </div>

                        {/* Responsável */}
                        <div className="hidden md:block md:col-span-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m?.avatar_url || "/minimal-avatar.png"} />
                              <AvatarFallback className="bg-[#3A3A3C] text-white/80">
                                {(m?.name?.[0] || m?.email?.[0] || "U").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white/90 truncate">{m?.name || "—"}</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="hidden md:block md:col-span-2">
                          <div className="flex items-center justify-center px-2 py-1">
                            <StatusBadge status={t.status} />
                          </div>
                        </div>

                        {/* Prazo */}
                        <div className="hidden md:block md:col-span-2">
                          <div className="flex items-center justify-center px-2 py-1">
                            <div className="text-sm text-center">
                              {t.due_date ? (
                                <span
                                  className={cn(
                                    "font-medium",
                                    new Date(t.due_date + "T00:00:00") < new Date() ? "text-red-400" : "text-white/70",
                                  )}
                                >
                                  {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                </span>
                              ) : (
                                <span className="text-white/50 italic text-xs">Sem prazo</span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                      
                      {/* Ações - Posicionamento absoluto fora do grid */}
                      <div className="hidden md:block absolute right-6 top-1/2 transform -translate-y-1/2">
                        <div className="flex items-center justify-center">
                          <button
                            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all p-2 rounded hover:bg-white/10"
                            title="Excluir tarefa"
                            onClick={(e) => {
                              e.stopPropagation()
                              void deleteTask(t.id)
                              if (openId === t.id) setOpenId(null)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </TabsContent>

          <TabsContent value="completas" className="m-0">
            <div className="divide-y divide-[#3A3A3C]">
              {!loading && completedTasks.length === 0 && (
                <div className="px-6 py-12 text-center text-white/70">
                  <p>Nenhuma tarefa concluída encontrada.</p>
                </div>
              )}
              {!loading &&
                completedTasks.map((t) => {
                  const m = t.assignee_id ? memberMap.get(t.assignee_id) : null
                  return (
                    <div
                      key={t.id}
                      className="px-6 py-4 min-h-[56px] hover:bg-[#2C2C2E] transition-colors cursor-pointer group opacity-75 relative"
                      onClick={() => setOpenId(t.id)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pr-20">
                        <div className="hidden md:block md:col-span-1">
                          <button
                            onClick={(e) => onToggle(e, t.id)}
                            disabled={savingId === t.id}
                            className="h-5 w-5 rounded-full bg-[#30D158] border-2 border-[#30D158] transition-all hover:scale-110"
                          />
                        </div>
                        <div className="col-span-1 md:col-span-4">
                          <div className="flex items-center gap-3 md:hidden">
                            <button
                              onClick={(e) => onToggle(e, t.id)}
                              disabled={savingId === t.id}
                              className="mt-1 h-4 w-4 rounded-full bg-[#30D158] border-2 border-[#30D158]"
                            />
                            <div>
                              <div 
                                className="font-medium text-[#F2F2F7] line-through whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 cursor-help" 
                                title={t.title}
                              >
                                {t.title}
                              </div>
                              {t.description && <p className="text-sm text-white/60 line-clamp-1 mt-1">{t.description}</p>}
                            </div>
                          </div>
                          <div className="hidden md:block">
                            <div 
                              className="font-medium text-[#F2F2F7] line-through whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 cursor-help" 
                              title={t.title}
                            >
                              {t.title}
                            </div>
                            {t.description && <p className="text-sm text-white/60 line-clamp-1 mt-1">{t.description}</p>}
                          </div>
                        </div>
                        <div className="hidden md:block md:col-span-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m?.avatar_url || "/minimal-avatar.png"} />
                              <AvatarFallback className="bg-[#3A3A3C] text-white/80">
                                {(m?.name?.[0] || m?.email?.[0] || "U").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white/60 truncate">{m?.name || "—"}</span>
                          </div>
                        </div>
                        <div className="hidden md:block md:col-span-2">
                          <div className="flex items-center justify-center px-2 py-1">
                            <StatusBadge status={t.status} />
                          </div>
                        </div>
                        <div className="hidden md:block md:col-span-2">
                          <div className="flex items-center justify-center px-2 py-1">
                            <div className="text-sm text-white/50 text-center">
                              {t.due_date ? new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "Sem prazo"}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ações - Posicionamento absoluto fora do grid */}
                      <div className="hidden md:block absolute right-6 top-1/2 transform -translate-y-1/2">
                        <div className="flex items-center justify-center">
                          <button
                            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all p-2 rounded hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              void deleteTask(t.id)
                              if (openId === t.id) setOpenId(null)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de edição */}
      <TaskDetailsSheet
        taskId={openId}
        open={Boolean(openId)}
        onOpenChange={(v) => {
          if (!v) setOpenId(null)
        }}
      />
    </>
  )
}

function PriorityBadge({ priority }: { priority: Priority | undefined }) {
  if (priority === "high") {
    return (
      <Badge className="rounded-full bg-[#FF453A]/15 border-[#FF453A] text-[#FF453A] text-xs px-2 py-0.5">
        Urgente
      </Badge>
    )
  }
  if (priority === "med") {
    return (
      <Badge className="rounded-full bg-[#FFD60A]/15 border-[#FFD60A] text-[#FFD60A] text-xs px-2 py-0.5">
        Prioridade
      </Badge>
    )
  }
  return (
    <Badge className="rounded-full bg-[#8E8E93]/15 border-[#8E8E93] text-[#8E8E93] text-xs px-2 py-0.5">
      Normal
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done") {
    return (
      <Badge className="rounded-full bg-[#30D158]/15 border-[#30D158] text-[#30D158] text-xs px-3 py-1">
        Concluído
      </Badge>
    )
  }
  if (status === "in-progress") {
    return (
      <Badge className="rounded-full bg-[#007AFF]/15 border-[#007AFF] text-[#007AFF] text-xs px-3 py-1">
        Em Progresso
      </Badge>
    )
  }
  return (
    <Badge className="rounded-full bg-[#FF9500]/15 border-[#FF9500] text-[#FF9500] text-xs px-3 py-1">
      Pendente
    </Badge>
  )
}