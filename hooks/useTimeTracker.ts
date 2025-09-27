import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
// Cache global para evitar requisições desnecessárias
const timeTrackerCache = new Map<string, {
  data: any
  timestamp: number
  loading: boolean
}>()
const CACHE_TTL = 30000 // 30 segundos
type TimerState = 'stopped' | 'running' | 'paused'
interface TimeSession {
  id: string
  task_id: string
  user_id: string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  created_at: string
}
interface UseTimeTrackerReturn {
  // Estado
  state: TimerState
  elapsedTime: number // em segundos
  formattedTime: string // HH:MM:SS
  totalTime: number // tempo total acumulado de todas as sessões
  formattedTotalTime: string
  isLoading: boolean
  // Ações
  start: () => Promise<void>
  pause: () => Promise<void>
  stop: () => Promise<void>
  // Dados
  currentSession: TimeSession | null
  sessions: TimeSession[]
  // Controle
  refresh: () => Promise<void>
}
export function useTimeTracker(taskId: string | null): UseTimeTrackerReturn {
  const { toast } = useToast()
  // Estados
  const [state, setState] = useState<TimerState>('stopped')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null)
  const [sessions, setSessions] = useState<TimeSession[]>([])
  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const localStorageKey = useRef(`timeTracker_${taskId}`)
  // Formatação de tempo
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])
  // Salvar estado no localStorage
  const saveToLocalStorage = useCallback((data: { state: TimerState, elapsedTime: number, sessionId?: string, startTime?: string }) => {
    if (!taskId) return
    localStorage.setItem(localStorageKey.current, JSON.stringify(data))
  }, [taskId])
  // Carregar estado do localStorage
  const loadFromLocalStorage = useCallback((): { state: TimerState, elapsedTime: number, sessionId?: string, startTime?: string } | null => {
    if (!taskId) return null
    try {
      const data = localStorage.getItem(localStorageKey.current)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }, [taskId])
  // Limpar localStorage
  const clearLocalStorage = useCallback(() => {
    if (!taskId) return
    localStorage.removeItem(localStorageKey.current)
  }, [taskId])
  // Buscar sessões e estado atual com cache e debounce
  const refresh = useCallback(async () => {
    if (!taskId) return
    // Verificar cache primeiro
    const cached = timeTrackerCache.get(taskId)
    const now = Date.now()
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      // Usar dados do cache
      const sessionsData = cached.data
      setSessions(sessionsData.sessions || [])
      setTotalTime(sessionsData.stats?.totalSeconds || 0)
      const activeSession = sessionsData.stats?.activeSession
      if (activeSession) {
        setCurrentSession(activeSession)
        setState('running')
        const startTime = new Date(activeSession.start_time)
        const elapsed = Math.floor((now - startTime.getTime()) / 1000)
        setElapsedTime(elapsed)
        saveToLocalStorage({
          state: 'running',
          elapsedTime: elapsed,
          sessionId: activeSession.id,
          startTime: activeSession.start_time
        })
      } else {
        const localData = loadFromLocalStorage()
        if (localData && localData.state === 'paused') {
          setState('paused')
          setElapsedTime(localData.elapsedTime)
        } else {
          setState('stopped')
          setElapsedTime(0)
          clearLocalStorage()
        }
      }
      setIsLoading(false)
      return
    }
    // Se já está fazendo requisição, aguardar
    if (cached?.loading) {
      return
    }
    // Marcar como loading no cache
    timeTrackerCache.set(taskId, {
      data: cached?.data || null,
      timestamp: cached?.timestamp || 0,
      loading: true
    })
    setIsLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) return
      // Buscar sessões
      const sessionsRes = await fetch(`/api/tasks/${taskId}/time/sessions`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        // Atualizar cache
        timeTrackerCache.set(taskId, {
          data: sessionsData,
          timestamp: Date.now(),
          loading: false
        })
        setSessions(sessionsData.sessions || [])
        setTotalTime(sessionsData.stats?.totalSeconds || 0)
        // Verificar se há sessão ativa
        const activeSession = sessionsData.stats?.activeSession
        if (activeSession) {
          setCurrentSession(activeSession)
          setState('running')
          // Calcular tempo decorrido
          const startTime = new Date(activeSession.start_time)
          const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
          setElapsedTime(elapsed)
          // Salvar no localStorage
          saveToLocalStorage({
            state: 'running',
            elapsedTime: elapsed,
            sessionId: activeSession.id,
            startTime: activeSession.start_time
          })
        } else {
          // Não há sessão ativa - verificar localStorage
          const localData = loadFromLocalStorage()
          if (localData && localData.state === 'paused') {
            setState('paused')
            setElapsedTime(localData.elapsedTime)
          } else {
            setState('stopped')
            setElapsedTime(0)
            clearLocalStorage()
          }
        }
      }
    } catch (error) {
      // Remover loading flag do cache em caso de erro
      const cached = timeTrackerCache.get(taskId)
      if (cached) {
        timeTrackerCache.set(taskId, {
          ...cached,
          loading: false
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [taskId, saveToLocalStorage, loadFromLocalStorage, clearLocalStorage])
  // Iniciar timer
  const start = useCallback(async () => {
    if (!taskId || isLoading) return
    setIsLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error('Sessão expirada')
      const res = await fetch(`/api/tasks/${taskId}/time/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentSession(data.session)
      setState('running')
      setElapsedTime(0)
      saveToLocalStorage({
        state: 'running',
        elapsedTime: 0,
        sessionId: data.session.id,
        startTime: data.session.start_time
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar timer',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [taskId, isLoading, toast, saveToLocalStorage])
  // Pausar timer
  const pause = useCallback(async () => {
    if (state !== 'running' || !currentSession || isLoading) return
    setIsLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error('Sessão expirada')
      const res = await fetch(`/api/tasks/${taskId}/time/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState('paused')
      setCurrentSession(null)
      // Salvar estado pausado no localStorage
      saveToLocalStorage({
        state: 'paused',
        elapsedTime: elapsedTime
      })
      // Atualizar lista de sessões
      await refresh()
    } catch (error: any) {
      toast({
        title: 'Erro ao pausar timer',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [state, currentSession, isLoading, taskId, elapsedTime, toast, saveToLocalStorage, refresh])
  // Parar timer
  const stop = useCallback(async () => {
    if (state === 'stopped') return
    if (state === 'running' && currentSession) {
      // Se está rodando, parar a sessão atual
      await pause()
    }
    // Resetar tudo
    setState('stopped')
    setElapsedTime(0)
    setCurrentSession(null)
    clearLocalStorage()
    await refresh()
  }, [state, currentSession, pause, clearLocalStorage, refresh, toast])
  // Efeito para atualizar o contador a cada segundo quando rodando
  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1
          // Salvar no localStorage a cada minuto
          if (newTime % 60 === 0 && currentSession) {
            saveToLocalStorage({
              state: 'running',
              elapsedTime: newTime,
              sessionId: currentSession.id,
              startTime: currentSession.start_time
            })
          }
          return newTime
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state, currentSession, saveToLocalStorage])
  // Carregar dados iniciais com debounce
  useEffect(() => {
    if (taskId) {
      // Pequeno debounce para evitar muitas requisições simultâneas
      const timer = setTimeout(() => {
        refresh()
      }, Math.random() * 500) // 0-500ms delay aleatório
      return () => clearTimeout(timer)
    }
  }, [taskId, refresh])
  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
  return {
    state,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    totalTime,
    formattedTotalTime: formatTime(totalTime),
    isLoading,
    start,
    pause,
    stop,
    currentSession,
    sessions,
    refresh
  }
}