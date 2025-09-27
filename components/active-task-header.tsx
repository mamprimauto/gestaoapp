"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Clock, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { stopTimerForTask } from "@/lib/timer-utils"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTaskData } from "./task-data"

interface ActiveTaskHeaderProps {
  className?: string
}

interface ActiveTaskInfo {
  taskId: string
  taskTitle: string
  startTime: string
  currentDuration: number
}


const ActiveTaskHeaderComponent = ({ className }: ActiveTaskHeaderProps) => {
  const { toast } = useToast()
  const router = useRouter()
  const { updateTask } = useTaskData()
  const [activeTask, setActiveTask] = useState<ActiveTaskInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Formatação do tempo
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Buscar tarefas ativas e pendentes do usuário atual
  const loadActiveTask = useCallback(async () => {
    try {
      // Obter token de autenticação
      const supabase = await getSupabaseClient()
      
      if (!supabase) {
        console.warn('Supabase client not available, skipping active task check')
        setActiveTask(null)
        return
      }
      
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session?.access_token) {
        setActiveTask(null)
        return
      }

      // Buscar sessões ativas do usuário
      const activeResponse = await fetch('/api/user/active-sessions', {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      // Processar sessões ativas
      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        if (activeData.activeSessions && activeData.activeSessions.length > 0) {
          // Pegar apenas a primeira sessão ativa (mais recente)
          const sessionData = activeData.activeSessions[0]
          const currentDuration = Math.floor((Date.now() - new Date(sessionData.start_time).getTime()) / 1000)
          
          setActiveTask({
            taskId: sessionData.task_id,
            taskTitle: sessionData.task_title || 'Tarefa sem título',
            startTime: sessionData.start_time,
            currentDuration
          })
        } else {
          setActiveTask(null)
        }
      } else {
        setActiveTask(null)
      }


    } catch (error) {
      // Silenciar erros durante inicialização do Supabase
      if (error instanceof Error && error.message.includes('getSession')) {
        console.warn('ActiveTaskHeader: Waiting for Supabase client initialization')
      } else {
        console.error('Erro ao carregar tarefa ativa:', error)
      }
      setActiveTask(null)
    }
  }, [])

  // Parar timer da tarefa ativa
  const handleStopTimer = useCallback(async () => {
    if (!activeTask || loading) return

    setLoading(true)
    
    try {
      const result = await stopTimerForTask(activeTask.taskId)
      if (result.success) {
        // Mover tarefa para "Pendentes"
        await updateTask(activeTask.taskId, { kanban_column: 'todo' })
        
        // Atualização otimista imediata - remove a tarefa ativa
        setActiveTask(null)
        setLoading(false)
        
        // Notificar outros componentes imediatamente
        window.dispatchEvent(new CustomEvent('timerStopped'))
        
        toast({
          title: "Timer pausado",
          description: `Tempo registrado: ${formatTime(result.duration || 0)}`
        })
        
        // Recarregar dados em background para atualizar contagem de pendentes
        loadActiveTask()
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
  }, [activeTask, loading, toast, formatTime, loadActiveTask])

  // Navegar para departamento favorito
  const goToFavoriteDepartment = useCallback(() => {
    if (typeof window !== 'undefined') {
      const favoriteWorkspace = localStorage.getItem('favoriteWorkspace')
      if (favoriteWorkspace) {
        router.push(`/tarefas?workspace=${favoriteWorkspace}`)
      } else {
        router.push('/tarefas')
      }
    }
  }, [router])

  // Atualizar tempo a cada segundo quando há tarefa ativa
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (activeTask) {
      interval = setInterval(() => {
        setActiveTask(prev => {
          if (!prev) return null
          return {
            ...prev,
            currentDuration: Math.floor((Date.now() - new Date(prev.startTime).getTime()) / 1000)
          }
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTask?.taskId])

  // Carregar dados iniciais e atualizar periodicamente
  useEffect(() => {
    // Delay inicial reduzido para resposta mais rápida
    const initialDelay = setTimeout(() => {
      loadActiveTask()
    }, 500)
    
    // Atualizar dados a cada 3 segundos para sincronização rápida com tarefas
    const interval = setInterval(loadActiveTask, 3000)
    
    // Escutar eventos personalizados para sincronização imediata
    const handleTimerEvent = () => {
      loadActiveTask()
    }
    
    window.addEventListener('timerStarted', handleTimerEvent)
    window.addEventListener('timerStopped', handleTimerEvent)
    
    return () => {
      clearTimeout(initialDelay)
      clearInterval(interval)
      window.removeEventListener('timerStarted', handleTimerEvent)
      window.removeEventListener('timerStopped', handleTimerEvent)
    }
  }, [loadActiveTask])

  // Controlar visibilidade simples
  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Aplicar padding-top globalmente quando o header estiver visível
  useEffect(() => {
    const rootElement = document.documentElement
    
    const updateHeaderHeight = () => {
      const headerElement = document.querySelector('[data-active-header]') as HTMLElement
      if (headerElement) {
        const height = headerElement.offsetHeight
        rootElement.style.setProperty('--active-task-header-height', `${height}px`)
      } else {
        rootElement.style.setProperty('--active-task-header-height', '4rem')
      }
    }

    // Atualizar altura inicial e a cada segundo
    updateHeaderHeight()
    const interval = setInterval(updateHeaderHeight, 1000)
    
    // Escutar mudanças no tamanho da tela
    window.addEventListener('resize', updateHeaderHeight)

    // Cleanup ao desmontar o componente
    return () => {
      clearInterval(interval)
      rootElement.style.removeProperty('--active-task-header-height')
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  // Sempre mostrar o header (será controlado pela animação de visibilidade)

  return (
    <div 
      data-active-header
      style={!activeTask ? { backgroundColor: '#030711' } : undefined}
      className={cn(
        "fixed top-0 z-50 backdrop-blur-sm shadow-lg",
        activeTask ? "border-b" : "",
        "left-56 right-0 md:left-64 lg:left-72", // Responsivo ao sidebar
        "px-8 flex items-center justify-between",
        activeTask ? "py-4" : "py-3",
        "transform transition-all duration-500 ease-in-out",
        isVisible 
          ? "translate-y-0 opacity-100" 
          : "-translate-y-full opacity-0",
        // Diferentes cores baseado no estado
        activeTask 
          ? "bg-gradient-to-r from-green-900/90 to-emerald-900/90 border-green-500/20"
          : "border-gray-700/30",
        className
      )}>
      {activeTask ? (
          // Estado ativo - mostra tarefa atual
          <>
            <div 
              onClick={goToFavoriteDepartment}
              className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 cursor-pointer hover:bg-white/5 transition-colors duration-200 -mx-8 px-8 -my-4 py-4 rounded-lg"
            >
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-400" />
              <span className="text-xs md:text-sm font-medium text-green-300 hidden sm:inline">
                Você está trabalhando na tarefa
              </span>
              <span className="text-xs font-medium text-green-300 sm:hidden">
                Trabalhando:
              </span>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <span className="text-xs md:text-sm font-semibold text-white bg-green-700/40 px-2 md:px-3 py-1 rounded-full border border-green-500/30 truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                "{activeTask.taskTitle}"
              </span>
              
              <div className="flex items-center gap-1.5 md:gap-2 bg-green-800/40 px-2 md:px-3 py-1 rounded-full border border-green-500/30 flex-shrink-0">
                <Clock className="h-3 w-3 text-green-400" />
                <span className="text-xs md:text-sm font-mono font-bold text-green-200">
                  {formatTime(activeTask.currentDuration)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStopTimer}
            disabled={loading}
            className={cn(
              "flex items-center gap-1 text-xs px-2 md:px-3 py-1.5 rounded-full transition-all flex-shrink-0",
              "bg-red-600/80 hover:bg-red-600 text-white border border-red-500/40",
              "hover:shadow-md hover:scale-105",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="h-3 w-3 animate-spin border border-white/30 border-t-white rounded-full" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">{loading ? "Parando..." : "Parar"}</span>
          </button>
        </>
      ) : (
        // Estado vazio - mostra mensagem motivacional (clicável)
        <div 
          onClick={goToFavoriteDepartment}
          className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 cursor-pointer -mx-8 px-8 -my-3 py-3 rounded-lg"
        >
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400 flex-shrink-0" />
          
          <span className="text-xs md:text-sm text-gray-200">
            Você não está trabalhando em nenhuma tarefa, que tal começar uma?
          </span>

          <div
            className={cn(
              "flex items-center gap-1 text-xs px-2 md:px-3 py-1.5 rounded-full transition-all flex-shrink-0",
              "bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500/40",
              "hover:shadow-md"
            )}
          >
            <span>Meu departamento</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
        )}
    </div>
  )
}

export const ActiveTaskHeader = memo(ActiveTaskHeaderComponent)