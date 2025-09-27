/**
 * Cache para sessões de tempo
 * Evita recarregar sessões frequentemente
 */

interface CacheEntry {
  data: any
  timestamp: number
}

class SessionsCache {
  private cache: Map<string, CacheEntry> = new Map()
  private ttl: number = 30 * 1000 // 30 segundos (sessões ativas mudam rapidamente)

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Verificar se expirou
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  // Invalidar cache quando uma sessão é iniciada/parada
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  // Invalidar todas as entradas relacionadas a uma tarefa
  invalidateTask(taskId: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(taskId)) {
        this.cache.delete(key)
      }
    })
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const data = this.get(key)
    return data !== null
  }
}

// Instância única do cache
export const sessionsCache = new SessionsCache()