"use client"

import { useEffect, useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { PencilLine, Save, CheckCircle2, Clock4, TrendingUp } from "lucide-react"
import DashboardGreeting from "@/components/dashboard-greeting"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { TaskDataProvider, useTaskData } from "./task-data"
import TasksCompletionChart from "./tasks-completion-chart"
import { useSelectedDate } from "./date-context"

type SectionKey = "greeting" | "tasks"
type SummaryKey = "today" | "pending" | "completion"
type RootItem = "summary" | SectionKey

// V3 layout config
type LayoutConfigV3 = {
  version: 3
  rootOrder: RootItem[]
  summaryOrder: SummaryKey[]
}

type LayoutConfigV2 = {
  version: number
  sectionOrder: SectionKey[]
  summaryOrder: SummaryKey[]
}
type LegacyLayoutV1 = { order: SectionKey[]; version?: number }

const DEFAULT_V3: LayoutConfigV3 = {
  version: 3,
  rootOrder: ["greeting", "summary", "tasks"],
  summaryOrder: ["today", "pending", "completion"],
}

const ROUTE = "/"

function lsKeys(uid?: string | null) {
  const base = `user-layout:${ROUTE}`
  return uid ? [`${base}:${uid}`, base] : [base]
}

export default function DashboardBoard() {
  return (
    <TaskDataProvider>
      <BoardInner />
    </TaskDataProvider>
  )
}

function BoardInner() {
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loadingRemote, setLoadingRemote] = useState(true)
  const [config, setConfig] = useState<LayoutConfigV3>(DEFAULT_V3)
  const [hasLocalLayout, setHasLocalLayout] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const [globalKey] = lsKeys()
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(globalKey) : null
      if (raw) {
        const parsed = normalizeToV3(JSON.parse(raw))
        setConfig(parsed)
        setHasLocalLayout(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: u, error: userErr } = await supabase.auth.getUser()
        if (userErr && userErr.name === 'AuthSessionMissingError') {
          setLoadingRemote(false)
          return // Sair silenciosamente se não há sessão
        }
        const uid = u.user?.id || null
        if (!uid) {
          setLoadingRemote(false)
          return
        }
        setUserId(uid)

        const fallbackName = (u.user?.user_metadata as any)?.name || (u.user?.email ? u.user.email.split("@")[0] : null)
        const { data: prof } = await supabase.from("profiles").select("name").eq("id", uid).maybeSingle()
        if (active) setDisplayName((prof as any)?.name || fallbackName || null)

        const { data } = await supabase
          .from("user_layouts")
          .select("config")
          .eq("user_id", uid)
          .eq("route", ROUTE)
          .maybeSingle()

        const conf = normalizeToV3((data?.config as any) || null)

        if (!active) return
        setConfig(conf)

        try {
          const [userKey, globalKey] = lsKeys(uid)
          window.localStorage.setItem(userKey, JSON.stringify(conf))
          window.localStorage.setItem(globalKey, JSON.stringify(conf))
        } catch {
          // ignore
        }
      } catch {
        // mantém padrão/local
      } finally {
        if (active) setLoadingRemote(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  function normalizeToV3(conf: LayoutConfigV3 | LayoutConfigV2 | LegacyLayoutV1 | null | undefined): LayoutConfigV3 {
    if (conf && "order" in (conf as any)) {
      const v1 = conf as LegacyLayoutV1
      const sections = normalizeOrder(v1.order, ["greeting", "tasks"]) as SectionKey[]
      return {
        version: 3,
        rootOrder: ["greeting", "summary", ...sections.filter((s) => s !== "greeting")] as RootItem[],
        summaryOrder: DEFAULT_V3.summaryOrder,
      }
    }
    if (conf && "sectionOrder" in (conf as any)) {
      const v2 = conf as LayoutConfigV2
      const sections = normalizeOrder(v2.sectionOrder, ["greeting", "tasks"]) as SectionKey[]
      const summary = normalizeOrder(v2.summaryOrder, ["today", "pending", "completion"]) as SummaryKey[]
      return {
        version: 3,
        rootOrder: ["greeting", "summary", ...sections.filter((s) => s !== "greeting")] as RootItem[],
        summaryOrder: summary,
      }
    }
    const v3 = (conf as LayoutConfigV3) || DEFAULT_V3
    const root = normalizeOrder(v3.rootOrder, ["greeting", "summary", "tasks"]) as RootItem[]
    const summary = normalizeOrder(v3.summaryOrder, ["today", "pending", "completion"]) as SummaryKey[]
    return { version: 3, rootOrder: root, summaryOrder: summary }
  }

  function normalizeOrder<T extends string>(incoming: T[] | undefined, allowed: readonly T[]): T[] {
    const inc = Array.isArray(incoming) ? incoming : []
    const filtered = inc.filter((k) => (allowed as readonly string[]).includes(k))
    const missing = allowed.filter((k) => !filtered.includes(k as any))
    return [...filtered, ...missing] as T[]
  }

  async function saveConfig(next: LayoutConfigV3) {
    if (!userId) return
    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      const payload = { user_id: userId, route: ROUTE, config: next }
      const { error } = await supabase.from("user_layouts").upsert(payload, { onConflict: "user_id,route" })
      if (error) throw error

      try {
        const [userKey, globalKey] = lsKeys(userId)
        window.localStorage.setItem(userKey, JSON.stringify(next))
        window.localStorage.setItem(globalKey, JSON.stringify(next))
      } catch {
        // ignore
      }

      toast({ title: "Layout salvo" })
    } catch (e: any) {
      toast({ title: "Erro ao salvar layout", description: e?.message || "Falha inesperada", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const from = result.source.index
    const to = result.destination.index
    if (from === to && result.source.droppableId === result.destination.droppableId) return

    const srcZone = result.source.droppableId
    if (srcZone === "root") {
      setConfig((prev) => {
        const next = [...prev.rootOrder]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        const newConf = { ...prev, rootOrder: next }
        void saveConfig(newConf)
        return newConf
      })
    } else if (srcZone === "summary") {
      setConfig((prev) => {
        const next = [...prev.summaryOrder]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        const newConf = { ...prev, summaryOrder: next }
        void saveConfig(newConf)
        return newConf
      })
    }
  }

  const ready = hasLocalLayout || !loadingRemote

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className={cn(
            "h-8 bg-transparent border-[#3A3A3C] text-white/80 hover:bg-white/5",
            editMode && "bg-white/10",
          )}
          onClick={() => setEditMode((v) => !v)}
          title={editMode ? "Sair do modo edição" : "Editar layout"}
        >
          {editMode ? <Save className="h-4 w-4 mr-2" /> : <PencilLine className="h-4 w-4 mr-2" />}
          {editMode ? "Concluir edição" : "Editar layout"}
        </Button>
        {saving && <span className="text-xs text-white/60">Salvando...</span>}
      </div>

      {!ready ? (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] animate-pulse" />
            ))}
          </div>
          <div className="h-28 rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] animate-pulse" />
          <div className="h-56 rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] animate-pulse" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="root" type="ROOT">
            {(rootProvided) => (
              <div ref={rootProvided.innerRef} {...rootProvided.droppableProps} className="grid gap-6">
                {config.rootOrder.map((item, index) => (
                  <Draggable key={item} draggableId={`root-${item}`} index={index} isDragDisabled={!editMode}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={cn(
                          editMode && "cursor-grab active:cursor-grabbing select-none",
                          snapshot.isDragging && "ring-2 ring-white/20 rounded-2xl",
                        )}
                      >
                        {item === "summary" ? (
                          <SummaryRow />
                        ) : item === "greeting" ? (
                          <DashboardGreeting name={displayName || undefined} />
                        ) : (
                          // No lugar da lista de tarefas, exibimos o gráfico
                          <TasksCompletionChart days={7} />
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {rootProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </section>
  )
}

function SummaryRow() {
  return <CombinedSummaryCard />
}

function CombinedSummaryCard() {
  const { getPersonalCounts, loading } = useTaskData()
  const { selectedDate } = useSelectedDate()
  const counts = getPersonalCounts(selectedDate)

  const meta = [
    {
      key: "today",
      title: "Tarefas Hoje",
      value: loading ? "—" : counts.doneToday,
      subtitle: "concluídas hoje",
      color: "#30D158",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      key: "pending",
      title: "Pendentes",
      value: loading ? "—" : counts.pending,
      subtitle: "tarefas aguardando",
      color: "#FFD60A",
      icon: <Clock4 className="h-4 w-4" />,
    },
    {
      key: "completion",
      title: "Taxa de Conclusão",
      value: loading ? "—" : `${counts.pct}%`,
      subtitle: "do total concluído",
      color: "#A78BFA",
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ] as const

  return (
    <div className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] text-[#F2F2F7]">
      <div className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {meta.map((m) => (
            <div key={m.key} className="rounded-xl">
              <div className="flex items-center justify-between">
                <div className="text-[13px] text-white/70">{m.title}</div>
                <div className="grid place-items-center rounded-lg px-1.5 py-1.5 bg-[#3A3A3C]">
                  <div className="h-4 w-4" style={{ color: m.color }}>
                    {m.icon}
                  </div>
                </div>
              </div>
              <div
                className={cn("mt-1.5 font-semibold leading-tight", loading && "animate-pulse")}
                style={{ color: m.color, fontSize: "1.375rem" }}
              >
                {m.value}
              </div>
              <div className="text-[11px] text-white/65 mt-0.5">{m.subtitle}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
