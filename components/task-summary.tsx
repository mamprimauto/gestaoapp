"use client"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarClock, CheckCircle2, Clock4, TrendingUp } from 'lucide-react'
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
type Status = "pending" | "in-progress" | "done"
type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  tag: string | null
  owner: string | null
  due_date: string | null // 'YYYY-MM-DD'
  status: Status
  priority: "low" | "med" | "high" | null
  created_at: string
  updated_at: string
}
// Polyfill simples para requestIdleCallback
const ric: typeof window.requestIdleCallback =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? window.requestIdleCallback.bind(window)
    : ((cb: IdleRequestCallback) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as any), 0)) as any
const cic: typeof window.cancelIdleCallback =
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? window.cancelIdleCallback.bind(window)
    : ((id: any) => clearTimeout(id)) as any
export default function TaskSummary() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let idleId: number | null = null
    let supabaseRef: any = null
    let channel: any = null
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        supabaseRef = supabase
        const { data: userResp, error: userErr } = await supabase.auth.getUser()
        if (userErr && userErr.name === 'AuthSessionMissingError') {
          if (active) setLoading(false)
          return // Sair silenciosamente se não há sessão
        }
        const uid = userResp.user?.id || null
        if (!uid) {
          if (active) setLoading(false)
          return
        }
        setUserId(uid)
        // Carrega tarefas (somente campos necessários)
        const { data, error } = await supabase
          .from("tasks")
          .select("id,user_id,title,description,tag,owner,due_date,status,priority,created_at,updated_at")
          .order("created_at", { ascending: false })
        if (error) throw error
        if (!active) return
        setTasks((data as Task[]) || [])
        // Assinatura realtime no idle para não bloquear render
        idleId = ric(() => {
          try {
            channel = supabase
              .channel("tasks-changes")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${uid}` },
                (payload) => {
                  if (!active) return
                  if (payload.eventType === "INSERT") {
                    setTasks((prev) => [payload.new as Task, ...prev])
                  } else if (payload.eventType === "UPDATE") {
                    setTasks((prev) =>
                      prev.map((t) => (t.id === (payload.new as any).id ? (payload.new as Task) : t))
                    )
                  } else if (payload.eventType === "DELETE") {
                    setTasks((prev) => prev.filter((t) => t.id !== (payload.old as any).id))
                  }
                }
              )
              .subscribe()
          } catch {
            // ignore
          }
        })
      } catch (err: any) {
        toast({
          title: "Erro ao carregar tarefas",
          description: err?.message || "Falha inesperada",
          variant: "destructive",
        })
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
      if (idleId) cic(idleId as any)
      if (supabaseRef && channel) {
        try {
          supabaseRef.removeChannel(channel)
        } catch {}
      }
    }
  }, [toast])
  const counts = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const doneToday = tasks.filter((t) => {
      const d = new Date(t.updated_at)
      const dStr = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toISOString()
        .slice(0, 10)
      return t.status === "done" && dStr === todayStr
    }).length
    const pending = tasks.filter((t) => t.status === "pending").length
    const progress = tasks.filter((t) => t.status === "in-progress").length
    const total = tasks.length
    const pct = total > 0 ? Math.round(((total - (pending + progress)) / total) * 100) : 0
    return { doneToday, pending, progress, pct }
  }, [tasks])
  async function toggleStatus(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const next: Status = task.status === "done" ? "pending" : "done"
    setSavingId(id)
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: next })
        .eq("id", id)
        .select("id,user_id,title,description,tag,owner,due_date,status,priority,created_at,updated_at")
        .single()
      if (error) throw error
      setTasks((prev) => prev.map((t) => (t.id === id ? (data as Task) : t)))
      // feedback sutil
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }
  async function addTask() {
    try {
      if (!userId) {
        toast({ title: "Sessão não encontrada", description: "Entre para criar tarefas." })
        return
      }
      const supabase = await getSupabaseClient()
      const today = new Date().toISOString().slice(0, 10)
      const payload = {
        user_id: userId,
        title: "Nova tarefa",
        description: "Descrição breve da tarefa",
        tag: "Backlog",
        owner: "Você",
        due_date: today,
        status: "pending" as Status,
        priority: null as const,
      }
      const { data, error } = await supabase
        .from("tasks")
        .insert(payload)
        .select("id,user_id,title,description,tag,owner,due_date,status,priority,created_at,updated_at")
        .single()
      if (error) throw error
      setTasks((prev) => [data as Task, ...prev])
    } catch (err: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
    }
  }
  async function addExamples() {
    try {
      if (!userId) return
      const supabase = await getSupabaseClient()
      const today = new Date().toISOString().slice(0, 10)
      const rows = [
        {
          user_id: userId,
          title: "Configurar campanha Google Ads",
          description: "Criar nova campanha para cliente premium",
          tag: "Campanha Premium Q3",
          owner: "Você",
          due_date: today,
          status: "pending" as Status,
          priority: "high" as const,
        },
        {
          user_id: userId,
          title: "Análise de performance Facebook",
          description: "Revisar métricas da semana passada",
          tag: "Social Media Q3",
          owner: "Você",
          due_date: today,
          status: "pending" as Status,
          priority: "med" as const,
        },
        {
          user_id: userId,
          title: "Otimização landing page",
          description: "Melhorar taxa de conversão da página principal",
          tag: "Website Optimization",
          owner: "Você",
          due_date: today,
          status: "in-progress" as Status,
          priority: "high" as const,
        },
        {
          user_id: userId,
          title: "Relatório semanal de tráfego",
          description: "Compilar dados de todas as fontes",
          tag: "Analytics",
          owner: "Você",
          due_date: today,
          status: "in-progress" as Status,
          priority: "med" as const,
        },
      ]
      const { data, error } = await supabase
        .from("tasks")
        .insert(rows)
        .select("id,user_id,title,description,tag,owner,due_date,status,priority,created_at,updated_at")
      if (error) throw error
      setTasks((prev) => ([...(data as Task[]), ...prev]))
    } catch (err: any) {
      toast({
        title: "Erro ao adicionar exemplos",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
    }
  }
  return (
    <section aria-label="Resumo e Lista de Tarefas" className="grid gap-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title="Tarefas Hoje"
          value={counts.doneToday}
          subtitle="concluídas hoje"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="#30D158"
          loading={loading}
        />
        <SummaryCard
          title="Pendentes"
          value={counts.pending}
          subtitle="tarefas aguardando"
          icon={<Clock4 className="h-5 w-5" />}
          accent="#FFD60A"
          loading={loading}
        />
        <SummaryCard
          title="Em Progresso"
          value={counts.progress}
          subtitle="em desenvolvimento"
          icon={<CalendarClock className="h-5 w-5" />}
          accent="#7C8CF8"
          loading={loading}
        />
        <Card className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] text-[#F2F2F7]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text白/70">Taxa de Conclusão</div>
              <TrendingUp className="h-5 w-5" style={{ color: "#A78BFA" }} />
            </div>
            <div className="mt-3 text-2xl font-semibold">{counts.pct}%</div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#3A3A3C]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${counts.pct}%`,
                  background: "linear-gradient(90deg, #7C8CF8, #A78BFA, #30D158)",
                }}
                aria-label={`Progresso ${counts.pct}%`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Lista de Tarefas */}
      <div className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#F2F2F7]">Lista de Tarefas</h2>
            <p className="text-sm text-white/70">
              Gerencie suas atividades de tráfego direto
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#3A3A3C] bg-transparent text-white/90 hover:bg-white/5 hover:text-white"
              onClick={addExamples}
              disabled={loading}
            >
              Exemplos
            </Button>
            <Button
              className="bg-[#FFD60A] text-black hover:bg-[#ffd60a]/90 rounded-xl"
              onClick={addTask}
              disabled={loading}
            >
              + Nova Tarefa
            </Button>
          </div>
        </div>
        <ul className="mt-4 grid gap-3">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] p-4 animate-pulse"
                >
                  <div className="h-4 w-1/3 bg-[#3A3A3C] rounded mb-2" />
                  <div className="h-3 w-2/3 bg-[#3A3A3C] rounded" />
                </li>
              ))}
            </>
          )}
          {!loading &&
            tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] p-4 hover:border-[#4A4A4A] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStatus(t.id)}
                    disabled={savingId === t.id}
                    className={cn(
                      "mt-1 h-4 w-4 rounded-full border border-[#4A4A4A] transition-colors",
                      t.status === "done" && "bg-[#30D158] border-[#30D158]",
                      savingId === t.id && "opacity-70"
                    )}
                    aria-label={
                      t.status === "done" ? "Marcar como pendente" : "Marcar como concluída"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-[#F2F2F7]">{t.title}</div>
                      <StatusBadge status={t.status} />
                    </div>
                    {t.description && (
                      <p className="mt-1 text-sm text-white/75">{t.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {t.tag && (
                        <Badge
                          variant="secondary"
                          className="rounded-full border border-[#4A4A4A] bg-[#3A3A3C] text-white"
                        >
                          {t.tag}
                        </Badge>
                      )}
                      {t.priority === "high" && (
                        <Badge className="rounded-full bg-[#3A3A3C] border border-[#4A4A4A] text-[#FFD60A]">
                          Alta
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-white/70">
                    <div>{t.owner || "—"}</div>
                    <div>
                      {t.due_date
                        ? new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")
                        : "Sem data"}
                    </div>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </section>
  )
}
function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  loading,
}: {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
  accent: string
  loading?: boolean
}) {
  return (
    <Card className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] text-[#F2F2F7]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/70">{title}</div>
          <div className="grid place-items-center rounded-xl p-2 bg-[#3A3A3C]">
            <div className="h-5 w-5" style={{ color: accent }}>
              {icon}
            </div>
          </div>
        </div>
        <div
          className={cn("mt-2 text-3xl font-semibold", loading && "animate-pulse")}
          style={{ color: accent }}
        >
          {loading ? "—" : value}
        </div>
        <div className="text-xs text-white/70">{subtitle}</div>
      </CardContent>
    </Card>
  )
}
function StatusBadge({ status }: { status: Status }) {
  if (status === "done") {
    return (
      <Badge
        className="rounded-full bg-[#30D158]/20 border"
        style={{ borderColor: "#30D158", color: "#30D158" }}
      >
        Concluída
      </Badge>
    )
  }
  if (status === "in-progress") {
    return (
      <Badge
        className="rounded-full bg-[#7C8CF8]/20 border"
        style={{ borderColor: "#7C8CF8", color: "#7C8CF8" }}
      >
        Em Progresso
      </Badge>
    )
  }
  return (
    <Badge
      className="rounded-full bg-[#FFD60A]/20 border"
      style={{ borderColor: "#FFD60A", color: "#FFD60A" }}
    >
      Pendente
    </Badge>
  )
}
