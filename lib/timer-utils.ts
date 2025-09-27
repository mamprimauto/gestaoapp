import { getSupabaseClient } from "@/lib/supabase/client"

export interface TimerSession {
  id: string
  task_id: string
  user_id: string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
}

/**
 * Inicia o timer para uma tarefa
 */
export async function startTimerForTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token

    if (!token) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const response = await fetch(`/api/tasks/${taskId}/time/start`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })

    if (response.ok) {
      return { success: true }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.error || `Erro ${response.status}` }
    }
  } catch (error) {
    return { success: false, error: "Erro interno ao iniciar timer" }
  }
}

/**
 * Para o timer para uma tarefa
 */
export async function stopTimerForTask(taskId: string): Promise<{ success: boolean; error?: string; duration?: number }> {
  try {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token

    if (!token) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const response = await fetch(`/api/tasks/${taskId}/time/stop`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })

    if (response.ok) {
      const data = await response.json()
      return { 
        success: true, 
        duration: data.session?.duration_seconds || data.duration_seconds 
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.error || `Erro ${response.status}` }
    }
  } catch (error) {
    return { success: false, error: "Erro interno ao parar timer" }
  }
}

/**
 * Verifica se há timer ativo para o usuário atual em uma tarefa
 */
export async function getActiveTimerForTask(taskId: string): Promise<{ hasActive: boolean; session?: TimerSession }> {
  try {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token

    if (!token) {
      return { hasActive: false }
    }

    const response = await fetch(`/api/tasks/${taskId}/time/sessions`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      // Retorna apenas a sessão ativa do usuário atual
      const activeSession = data.stats?.activeSession
      
      return { 
        hasActive: !!activeSession, 
        session: activeSession 
      }
    } else {
      return { hasActive: false }
    }
  } catch (error) {
    return { hasActive: false }
  }
}

/**
 * Verifica se há múltiplos usuários com timer ativo para uma tarefa
 */
export async function getActiveTimersForTask(taskId: string): Promise<{ 
  activeCount: number; 
  activeUsers: Array<{
    user: any;
    sessionId: string;
    startTime: string;
    currentDuration: number;
  }>;
  userHasActive: boolean;
}> {
  try {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token

    if (!token) {
      return { activeCount: 0, activeUsers: [], userHasActive: false }
    }

    const response = await fetch(`/api/tasks/${taskId}/time/sessions`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const activeUsers = data.stats?.activeUsers || []
      const userHasActive = data.stats?.hasActiveSession || false
      
      return { 
        activeCount: activeUsers.length,
        activeUsers,
        userHasActive
      }
    } else {
      return { activeCount: 0, activeUsers: [], userHasActive: false }
    }
  } catch (error) {
    return { activeCount: 0, activeUsers: [], userHasActive: false }
  }
}

/**
 * Obtém o tempo total gasto numa tarefa
 */
export async function getTotalTimeForTask(taskId: string): Promise<{ totalSeconds: number; sessions: TimerSession[] }> {
  try {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token

    if (!token) {
      return { totalSeconds: 0, sessions: [] }
    }

    const response = await fetch(`/api/tasks/${taskId}/time/sessions`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const sessions: TimerSession[] = data.sessions || []
      
      // Calcular tempo total das sessões completas
      const completedSeconds = sessions
        .filter(s => s.end_time) // Apenas sessões que foram finalizadas
        .reduce((acc, s) => {
          // Se duration_seconds existe, use ele, senão calcule manualmente
          let duration = s.duration_seconds
          if (!duration && s.start_time && s.end_time) {
            const startTime = new Date(s.start_time).getTime()
            const endTime = new Date(s.end_time).getTime()
            duration = Math.floor((endTime - startTime) / 1000) // diferença em segundos
          }
          return acc + (duration || 0)
        }, 0)
      
      // Adicionar tempo de sessões ativas
      const activeSeconds = sessions
        .filter(s => !s.end_time) // Sessões ativas
        .reduce((acc, s) => {
          const startTime = new Date(s.start_time).getTime()
          const currentTime = Date.now()
          const activeTime = Math.floor((currentTime - startTime) / 1000)
          return acc + activeTime
        }, 0)
      
      const totalSeconds = completedSeconds + activeSeconds
      
      // Debug log para investigar o problema das 43 horas
      if (totalSeconds > 3600 * 10) { // Mais de 10 horas
        console.log(`DEBUG HIGH TIME: Task ${taskId} - Total: ${totalSeconds}s (${Math.floor(totalSeconds/3600)}h)`)
        console.log('Completed sessions:', sessions.filter(s => s.end_time).map(s => ({
          duration: s.duration_seconds,
          start: s.start_time,
          end: s.end_time,
          calculated: s.start_time && s.end_time ? Math.floor((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 1000) : null
        })))
        console.log('Active sessions:', sessions.filter(s => !s.end_time).map(s => ({
          start: s.start_time,
          duration_calculated: Math.floor((Date.now() - new Date(s.start_time).getTime()) / 1000)
        })))
      }
      
      return { totalSeconds, sessions }
    } else {
      return { totalSeconds: 0, sessions: [] }
    }
  } catch (error) {
    return { totalSeconds: 0, sessions: [] }
  }
}

/**
 * Obtém o tempo trabalhado por um usuário em uma data específica (tarefas + criativos)
 */
export async function getUserTimeForDate(userEmail: string, date: string): Promise<{ totalSeconds: number; sessions: TimerSession[] }> {
  try {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token

    if (!token) {
      return { totalSeconds: 0, sessions: [] }
    }

    // Buscar tempo das tarefas regulares
    const tasksResponse = await fetch(`/api/users/${encodeURIComponent(userEmail)}/time?date=${date}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    let tasksSessions: TimerSession[] = []
    let tasksSeconds = 0

    if (tasksResponse.ok) {
      const data = await tasksResponse.json()
      tasksSessions = data.sessions || []
      
      const completedSessions = tasksSessions.filter(s => s.end_time)
      tasksSeconds = completedSessions.reduce((acc, s) => {
        let duration = s.duration_seconds
        if (!duration && s.start_time && s.end_time) {
          const startTime = new Date(s.start_time).getTime()
          const endTime = new Date(s.end_time).getTime()
          duration = Math.floor((endTime - startTime) / 1000)
        }
        return acc + (duration || 0)
      }, 0)
    }

    // Buscar tempo dos criativos
    const creativesResponse = await fetch(`/api/users/${encodeURIComponent(userEmail)}/creatives-time?date=${date}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    let creativesSessions: TimerSession[] = []
    let creativesSeconds = 0

    if (creativesResponse.ok) {
      const data = await creativesResponse.json()
      creativesSessions = data.sessions || []
      
      const completedSessions = creativesSessions.filter(s => s.end_time)
      creativesSeconds = completedSessions.reduce((acc, s) => {
        let duration = s.duration_seconds
        if (!duration && s.start_time && s.end_time) {
          const startTime = new Date(s.start_time).getTime()
          const endTime = new Date(s.end_time).getTime()
          duration = Math.floor((endTime - startTime) / 1000)
        }
        return acc + (duration || 0)
      }, 0)
    }

    // Combinar todas as sessões
    const allSessions = [...tasksSessions, ...creativesSessions]
    const totalSeconds = tasksSeconds + creativesSeconds
    
    
    return { totalSeconds, sessions: allSessions }
  } catch (error) {
    return { totalSeconds: 0, sessions: [] }
  }
}

/**
 * Formata segundos para HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}