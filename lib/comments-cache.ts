/**
 * Cache para comentários de tarefas
 * Evita recarregar comentários frequentemente
 */

interface CacheEntry {
  data: any
  timestamp: number
}

class CommentsCache {
  private cache: Map<string, CacheEntry> = new Map()
  private ttl: number = 2 * 60 * 1000 // 2 minutos (comentários mudam mais frequentemente)

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

  // Invalidar cache quando um novo comentário é adicionado
  invalidate(key: string): void {
    this.cache.delete(key)
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
export const commentsCache = new CommentsCache()