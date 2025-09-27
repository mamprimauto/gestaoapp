/**
 * Cache simples para tempo de tarefas
 * Evita chamadas repetidas à API lenta
 */

interface CacheEntry {
  data: any
  timestamp: number
}

class TimeCache {
  private cache: Map<string, CacheEntry> = new Map()
  private ttl: number = 5 * 60 * 1000 // 5 minutos

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

  clear(): void {
    this.cache.clear()
  }

  // Invalidar cache específico
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  // Verificar se tem cache válido
  has(key: string): boolean {
    const data = this.get(key)
    return data !== null
  }
}

// Instância única do cache
export const timeCache = new TimeCache()