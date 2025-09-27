"use client"

import { useState, useEffect } from "react"
import { Play, Pause, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getActiveTimersForTask, startTimerForTask, stopTimerForTask } from "@/lib/timer-utils"
import { useTaskData } from "./task-data"

interface MultiUserTimerProps {
  taskId: string
  size?: "sm" | "md"
  showActiveUsers?: boolean
}

interface ActiveUser {
  user: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  sessionId: string
  startTime: string
  currentDuration: number
}

export function MultiUserTimer({ taskId, size = "md", showActiveUsers = true }: MultiUserTimerProps) {
  const { toast } = useToast()
  const { updateTask } = useTaskData()
  const [isUserActive, setIsUserActive] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [loading, setLoading] = useState(false)
  const [totalTime, setTotalTime] = useState(0)
  
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

  // Formatação para cards (apenas horas e minutos)
  const formatTimeCard = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Carregar dados dos timers ativos
  const loadActiveTimers = async () => {
    try {
      const result = await getActiveTimersForTask(taskId)
      setIsUserActive(result.userHasActive)
      
      // Carregar tempo total da tarefa
      const { getTotalTimeForTask } = await import("@/lib/timer-utils")
      const totalResult = await getTotalTimeForTask(taskId)
      setTotalTime(totalResult.totalSeconds)
      
      // Atualizar currentDuration para todos os usuários ativos
      if (result.activeUsers.length > 0) {
        const updatedActiveUsers = result.activeUsers.map(user => ({
          ...user,
          currentDuration: Math.floor((Date.now() - new Date(user.startTime).getTime()) / 1000)
        }))
        setActiveUsers(updatedActiveUsers)
      } else {
        setActiveUsers([])
      }
    } catch (error) {
      console.error('Erro ao carregar timers ativos:', error)
    }
  }

  // Função auxiliar para obter ID do usuário atual
  const getCurrentUserId = async () => {
    try {
      const supabase = await import("@/lib/supabase/client").then(m => m.getSupabaseClient())
      const { data: session } = await supabase.auth.getSession()
      return session.session?.user?.id || null
    } catch {
      return null
    }
  }

  // Iniciar timer
  const startTimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading || isUserActive) return

    setLoading(true)
    try {
      const result = await startTimerForTask(taskId)
      if (result.success) {
        setIsUserActive(true)
        
        // Mover tarefa para "Em Progresso"
        await updateTask(taskId, { kanban_column: 'in-progress' })
        
        // Notificar header imediatamente
        window.dispatchEvent(new CustomEvent('timerStarted'))
        
        await loadActiveTimers()
        toast({
          title: "Timer iniciado",
          description: "Seu cronômetro foi iniciado para esta tarefa."
        })
      } else {
        throw new Error(result.error || "Erro desconhecido")
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
    if (loading || !isUserActive) return

    setLoading(true)
    try {
      const result = await stopTimerForTask(taskId)
      if (result.success) {
        // Atualização otimista imediata
        setIsUserActive(false)
        setLoading(false)
        
        // Mover tarefa para "Pendentes"
        await updateTask(taskId, { kanban_column: 'todo' })
        
        // Notificar header imediatamente
        window.dispatchEvent(new CustomEvent('timerStopped'))
        
        toast({
          title: "Timer pausado",
          description: `Tempo registrado: ${formatTime(result.duration || 0)}`
        })
        
        // Recarregar dados em background
        loadActiveTimers()
      } else {
        throw new Error(result.error || "Erro desconhecido")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível pausar o timer.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  // Atualizar tempo a cada segundo quando há usuários ativos
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (activeUsers.length > 0) {
      interval = setInterval(() => {
        // Força re-render para atualizar tempo ativo dos usuários
        setActiveUsers(prev => prev.map(user => ({
          ...user,
          currentDuration: Math.floor((Date.now() - new Date(user.startTime).getTime()) / 1000)
        })))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeUsers.length])

  // Atualizar tempo total periodicamente quando não há timer ativo (para mostrar tempo acumulado)
  useEffect(() => {
    if (totalTime === 0) {
      // Buscar tempo total inicial
      loadActiveTimers()
    }
  }, [])

  // Carregar dados iniciais e atualizar periodicamente
  useEffect(() => {
    if (!taskId.toString().startsWith('temp-')) {
      loadActiveTimers()
      
      // Atualizar dados a cada 30 segundos
      const interval = setInterval(loadActiveTimers, 30000)
      
      // Escutar eventos de timer para sincronização imediata
      const handleTimerEvent = () => {
        loadActiveTimers()
      }
      
      window.addEventListener('timerStarted', handleTimerEvent)
      window.addEventListener('timerStopped', handleTimerEvent)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('timerStarted', handleTimerEvent)
        window.removeEventListener('timerStopped', handleTimerEvent)
      }
    }
  }, [taskId])

  const buttonSize = size === "sm" ? "h-6 w-6" : "h-8 w-8"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  const isTemporary = taskId.toString().startsWith('temp-')

  return (
    <div className="flex items-center gap-2">
      {/* Botão Play/Pause */}
      <button
        onClick={isTemporary ? undefined : (isUserActive ? pauseTimer : startTimer)}
        disabled={loading || isTemporary}
        className={cn(
          buttonSize,
          "rounded-lg border-2 flex items-center justify-center transition-all duration-200",
          isTemporary 
            ? "border-gray-500 bg-gray-500/10 opacity-50 cursor-not-allowed"
            : isUserActive 
            ? "border-green-500 bg-green-500/10 hover:bg-green-500/20" 
            : "border-[#3A3A3C] bg-[#2C2C2E] hover:border-[#4A4A4C] hover:bg-[#3A3A3C]",
          loading && "opacity-50 cursor-not-allowed"
        )}
        title={isTemporary ? "Timer indisponível para tarefas temporárias" : (isUserActive ? "Pausar timer" : "Iniciar timer")}
      >
        {loading ? (
          <div className={cn(iconSize, "animate-spin border-2 border-white/30 border-t-white rounded-full")} />
        ) : isUserActive ? (
          <Pause className={cn(iconSize, "text-green-500")} />
        ) : (
          <Play className={cn(iconSize, "text-white/60")} />
        )}
      </button>

      {/* Display do tempo total combinado de todos os usuários */}
      {(totalTime > 0 || activeUsers.length > 0) && (
        <span className={cn(
          textSize,
          activeUsers.length > 0 ? "font-mono text-green-400 font-medium min-w-0" : "font-mono text-white/60 font-medium min-w-0"
        )}>
          {(() => {
            // Calcular tempo ativo de TODOS os usuários ativos
            const allActiveTime = activeUsers.reduce((acc, user) => {
              return acc + user.currentDuration
            }, 0)
            
            const combinedTime = totalTime + allActiveTime
            
            return size === "sm" 
              ? formatTimeCard(combinedTime)
              : formatTime(combinedTime)
          })()}
        </span>
      )}

      {/* Avatares dos usuários ativos - máximo 2 */}
      {showActiveUsers && activeUsers.length > 0 && (
        <div className="flex -space-x-1">
          {activeUsers.slice(0, 2).map((activeUser, index) => (
            <Avatar 
              key={activeUser.sessionId} 
              className={cn(
                size === "sm" ? "h-5 w-5" : "h-6 w-6",
                "border-2 border-green-500/60 ring-1 ring-green-400/30"
              )}
              title={`${activeUser.user.name} - ${formatTime(activeUser.currentDuration)}`}
            >
              <AvatarImage src={activeUser.user.avatar_url || "/minimal-avatar.png"} />
              <AvatarFallback className="text-xs bg-green-600/20 text-green-300 font-semibold">
                {activeUser.user.name ? activeUser.user.name.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </div>
  )
}