"use client"

import { useState, useEffect } from "react"
import { Play, Pause, Square } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useTaskData } from "./task-data"

interface InlineTimerProps {
  taskId: string
  size?: "sm" | "md"
}

interface TimeSession {
  id: string
  start_time: string
  end_time: string | null
  duration_seconds?: number
}

export function InlineTimer({ taskId, size = "md" }: InlineTimerProps) {
  const { toast } = useToast()
  const { updateTask } = useTaskData()
  const [isRunning, setIsRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  

  // Formatação do tempo
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Carregar tempo total e sessão ativa
  const loadTimeData = async () => {
    try {
      // Usar a mesma função que o kanban-card para consistência
      const { getTotalTimeForTask, getActiveTimerForTask } = await import("@/lib/timer-utils")
      
      // Obter dados de tempo total (inclui sessões ativas)
      const timeResult = await getTotalTimeForTask(taskId)
      setTotalTime(timeResult.totalSeconds)
      
      // Verificar se há sessão ativa
      const activeResult = await getActiveTimerForTask(taskId)
      
      if (activeResult.hasActive && activeResult.session) {
        setCurrentSessionId(activeResult.session.id)
        setIsRunning(true)
        
        // Calcular tempo desde o início da sessão ativa
        const startTime = new Date(activeResult.session.start_time).getTime()
        const currentSessionTime = Math.floor((Date.now() - startTime) / 1000)
        setCurrentTime(currentSessionTime)
      } else {
        setIsRunning(false)
        setCurrentTime(0)
        setCurrentSessionId(null)
      }
    } catch (error) {
    }
  }

  // Iniciar timer
  const startTimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading || isRunning) return

    setLoading(true)
    try {
      // Obter token de autenticação
      const supabase = await import("@/lib/supabase/client").then(m => m.getSupabaseClient())
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        throw new Error("Usuário não autenticado")
      }

      const res = await fetch(`/api/tasks/${taskId}/time/start`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentSessionId(data.session?.id || data.id)
        setIsRunning(true)
        setCurrentTime(0)
        
        // Mover tarefa para "Em Progresso"
        await updateTask(taskId, { kanban_column: 'in-progress' })
        
        toast({
          title: "Timer iniciado",
          description: "Cronômetro do criativo foi iniciado."
        })
      } else {
        const errorData = await res.json().catch(() => ({}))

        // Se o erro é por sessão já ativa, tenta parar primeiro e depois iniciar
        if (res.status === 400 && errorData.error?.includes("sessão ativa")) {
          try {
            await fetch(`/api/tasks/${taskId}/time/stop`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`
              }
            })
            
            // Aguarda um pouco e tenta novamente
            await new Promise(resolve => setTimeout(resolve, 500))
            
            const retryRes = await fetch(`/api/tasks/${taskId}/time/start`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`
              }
            })
            
            if (retryRes.ok) {
              const retryData = await retryRes.json()
              setCurrentSessionId(retryData.session?.id || retryData.id)
              setIsRunning(true)
              setCurrentTime(0)
              
              // Mover tarefa para "Em Progresso"
              await updateTask(taskId, { kanban_column: 'in-progress' })
              
              toast({
                title: "Timer iniciado",
                description: "Cronômetro do criativo foi iniciado."
              })
              return
            }
          } catch (retryError) {

          }
        }
        
        throw new Error(errorData.error || `Erro ${res.status} ao iniciar timer`)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o timer.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Pausar timer
  const pauseTimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (loading || !isRunning || !currentSessionId) {
      return
    }

    setLoading(true)
    try {
      // Obter token de autenticação
      const supabase = await import("@/lib/supabase/client").then(m => m.getSupabaseClient())
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        throw new Error("Usuário não autenticado")
      }

      const res = await fetch(`/api/tasks/${taskId}/time/stop`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (res.ok) {
        setIsRunning(false)
        setCurrentSessionId(null)
        
        // Mover tarefa para "Pendentes"
        await updateTask(taskId, { kanban_column: 'todo' })
        
        await loadTimeData() // Recarregar dados
        toast({
          title: "Timer pausado",
          description: "Tempo registrado com sucesso."
        })
      } else {
        throw new Error("Erro ao pausar timer")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível pausar o timer.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Atualizar tempo a cada segundo quando está rodando
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1)
        setTotalTime(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  // Carregar dados iniciais
  useEffect(() => {
    if (!taskId.toString().startsWith('temp-')) {
      loadTimeData()
    }
  }, [taskId])

  const buttonSize = size === "sm" ? "h-6 w-6" : "h-8 w-8"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <div className="flex items-center gap-2">
      {/* Botão Play/Pause */}
      <button
        onClick={taskId.toString().startsWith('temp-') ? undefined : (isRunning ? pauseTimer : startTimer)}
        disabled={loading || taskId.toString().startsWith('temp-')}
        className={cn(
          buttonSize,
          "rounded-lg border-2 flex items-center justify-center transition-all duration-200",
          taskId.toString().startsWith('temp-') 
            ? "border-gray-500 bg-gray-500/10 opacity-50 cursor-not-allowed"
            : isRunning 
            ? "border-green-500 bg-green-500/10 hover:bg-green-500/20" 
            : "border-[#3A3A3C] bg-[#2C2C2E] hover:border-[#4A4A4C] hover:bg-[#3A3A3C]",
          loading && "opacity-50 cursor-not-allowed"
        )}
        title={taskId.toString().startsWith('temp-') ? "Timer indisponível para tarefas temporárias" : (isRunning ? "Pausar timer" : "Iniciar timer")}
      >
        {loading ? (
          <div className={cn(iconSize, "animate-spin border-2 border-white/30 border-t-white rounded-full")} />
        ) : isRunning ? (
          <Pause className={cn(iconSize, "text-green-500")} />
        ) : (
          <Play className={cn(iconSize, "text-white/60")} />
        )}
      </button>

      {/* Display do tempo */}
      {totalTime > 0 && (
        <span className={cn(
          textSize,
          "font-mono text-white/90 font-medium min-w-0",
          isRunning && "text-green-400"
        )}>
          {formatTime(totalTime)}
        </span>
      )}
    </div>
  )
}