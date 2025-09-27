import { useState, useEffect, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { timeCache } from "@/lib/time-cache"
/**
 * Hook para buscar tempo de múltiplas tasks em batch
 * Agrupa requisições e faz uma única chamada à API
 */
interface BatchRequest {
  taskIds: Set<string>
  callbacks: Map<string, Array<(data: any) => void>>
  timer: NodeJS.Timeout | null
}
class BatchTimeLoader {
  private request: BatchRequest = {
    taskIds: new Set(),
    callbacks: new Map(),
    timer: null
  }
  private async executeBatch() {
    const taskIds = Array.from(this.request.taskIds)
    const callbacks = this.request.callbacks
    // Limpar estado para próximo batch
    this.request.taskIds.clear()
    this.request.callbacks.clear()
    this.request.timer = null
    if (taskIds.length === 0) return
    try {
      const supabase = await getSupabaseClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        // Notificar todos os callbacks com erro
        callbacks.forEach((callbackList) => {
          callbackList.forEach(cb => cb(null))
        })
        return
      }
      // Fazer chamada batch
      const res = await fetch('/api/tasks/time/batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ taskIds })
      })
      if (res.ok) {
        const { times } = await res.json()
        // Cachear e notificar callbacks
        Object.entries(times).forEach(([taskId, data]) => {
          const cacheKey = `time_${taskId}`
          timeCache.set(cacheKey, data)
          const taskCallbacks = callbacks.get(taskId) || []
          taskCallbacks.forEach(cb => cb(data))
        })
      } else {
        // Notificar todos os callbacks com erro
        callbacks.forEach((callbackList) => {
          callbackList.forEach(cb => cb(null))
        })
      }
    } catch (error) {
      callbacks.forEach((callbackList) => {
        callbackList.forEach(cb => cb(null))
      })
    }
  }
  public loadTime(taskId: string): Promise<any> {
    return new Promise((resolve) => {
      // Verificar cache primeiro
      const cacheKey = `time_${taskId}`
      const cached = timeCache.get(cacheKey)
      if (cached) {
        resolve(cached)
        return
      }
      // Adicionar ao batch
      this.request.taskIds.add(taskId)
      if (!this.request.callbacks.has(taskId)) {
        this.request.callbacks.set(taskId, [])
      }
      this.request.callbacks.get(taskId)!.push(resolve)
      // Agendar execução do batch (debounce de 50ms)
      if (this.request.timer) {
        clearTimeout(this.request.timer)
      }
      this.request.timer = setTimeout(() => {
        this.executeBatch()
      }, 50)
    })
  }
}
// Instância única do batch loader
const batchLoader = new BatchTimeLoader()
export function useBatchTime(taskId: string) {
  const [timeData, setTimeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    async function loadTime() {
      setLoading(true)
      try {
        const data = await batchLoader.loadTime(taskId)
        if (!cancelled) {
          setTimeData(data)
          setLoading(false)
        }
      } catch (error) {
        if (!cancelled) {
          setTimeData(null)
          setLoading(false)
        }
      }
    }
    loadTime()
    return () => {
      cancelled = true
    }
  }, [taskId])
  return { timeData, loading }
}