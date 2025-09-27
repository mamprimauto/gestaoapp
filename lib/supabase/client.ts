"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabase: SupabaseClient | null = null
let initializing: Promise<SupabaseClient> | null = null
let supabaseAnonKey: string | null = null // Armazenar a anon key para usar nos headers

// Usar uma abordagem mais simples: XMLHttpRequest como fallback para contornar extensões
const nativeFetch = (() => {
  if (typeof window !== 'undefined') {
    // Armazenar referência do fetch nativo
    return window.fetch.bind(window)
  }
  return fetch
})()

type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
}

async function fetchPublicEnv(): Promise<{ url: string; anon: string } | null> {
  try {
    const res = await fetch("/api/public-env", { cache: "no-store" })
    if (!res.ok) {
      // API returned error status
      return null
    }
    const json = (await res.json()) as { url?: string; anon?: string }
    if (json?.url && json?.anon) return { url: json.url, anon: json.anon }
    // API response missing url or anon keys
    return null
  } catch (e) {
    // Failed to fetch public environment
    return null
  }
}

// XMLHttpRequest fallback para quando fetch é bloqueado por extensões
function xhrFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const method = options.method || 'GET'
    
    xhr.open(method, url)
    
    // Configurar headers
    if (options.headers) {
      const headers = options.headers as Record<string, string>
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key])
      })
    }
    
    xhr.onload = () => {
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: new Headers(xhr.getAllResponseHeaders().split('\r\n').reduce((acc, line) => {
          const parts = line.split(': ')
          if (parts.length === 2) {
            acc[parts[0]] = parts[1]
          }
          return acc
        }, {} as Record<string, string>))
      })
      resolve(response)
    }
    
    xhr.onerror = () => reject(new Error('XHR request failed'))
    xhr.ontimeout = () => reject(new Error('XHR request timeout'))
    
    xhr.timeout = 30000 // 30 segundos
    xhr.send(options.body || null)
  })
}

// Connection status tracking
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
let connectionFailures = 0
const MAX_CONNECTION_FAILURES = 3

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true
    connectionFailures = 0
  })
  
  window.addEventListener('offline', () => {
    isOnline = false
    // Connection lost
  })
}

// Armazenar token da sessão atual para uso no safeFetch
let currentSessionToken: string | null = null

// Atualizar token quando a sessão mudar
export function updateSessionToken(token: string | null) {
  currentSessionToken = token
}

// Fetch com retry e fallback para XHR quando extensões interferem
async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  const maxRetries = 3
  let retryCount = 0
  
  if (url.startsWith('chrome-extension://')) {
    // Ignoring Chrome extension request
    throw new Error('Chrome extension request blocked')
  }
  
  // Check if we're offline - but don't block, just log
  // Commenting out to prevent false positives
  // if (!isOnline) {
  //   console.warn('Navigator reports offline, but attempting request anyway')
  // }

  // Garantir headers básicos
  const headers = {
    ...init?.headers,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
  
  // Para requisições POST/PUT/PATCH, garantir Content-Type correto
  if (init?.method && ['POST', 'PUT', 'PATCH'].includes(init.method.toUpperCase())) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }
  }
  
  // Para requisições Supabase, adicionar apikey e Authorization
  if (supabaseAnonKey && url.includes('supabase.co')) {
    // Sempre incluir a apikey (obrigatória)
    headers['apikey'] = supabaseAnonKey
    
    // Para requisições de Storage, FORÇAR o Authorization
    if (url.includes('/storage/')) {
      // Se não tem Authorization, usar o token salvo ou anon key
      if (!headers['Authorization'] && !headers['authorization']) {
        if (currentSessionToken) {
          headers['Authorization'] = `Bearer ${currentSessionToken}`
        } else {
          // Fallback: usar a anon key como Bearer token
          headers['Authorization'] = `Bearer ${supabaseAnonKey}`
        }
      }
    }
  }
  
  while (retryCount <= maxRetries) {
    try {
      // Add timeout to the request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await nativeFetch(input, {
        ...init,
        headers,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok || response.status < 500) {
        // Reset connection failure count on success
        connectionFailures = 0
        
        if (retryCount > 0) {
        }
        
        return response
      }
      
      // Server error (5xx) - retry
      if (response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Client error (4xx) - don't retry
      return response
      
    } catch (fetchError: any) {
      const errorMsg = fetchError.message || String(fetchError)
      
      // Verifica se é erro de autenticação ou falta de credenciais
      if (errorMsg.includes('Failed to fetch')) {
        const requestUrl = typeof input === 'string' ? input : (input as Request).url
        
        // Se é uma chamada Supabase sem autenticação, retornar erro 401 ao invés de crashar
        if (requestUrl.includes('supabase.co')) {

          // Verificar se tem apikey pelo menos
          if (!headers['apikey']) {
            return new Response(JSON.stringify({ 
              error: 'Missing API key',
              message: 'Supabase API key não configurada'
            }), {
              status: 401,
              statusText: 'Unauthorized',
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }
      }
      
      // Track connection failures
      connectionFailures++
      
      // Retry attempt failed
      
      // If we've had too many connection failures, assume we're offline
      if (connectionFailures >= MAX_CONNECTION_FAILURES) {
        isOnline = false
        // Too many connection failures, assuming offline mode
      }
      
      // Check if it's a retryable error
      const isRetryable = (
        errorMsg.includes('Failed to fetch') ||
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('ENOTFOUND') ||
        errorMsg.includes('ETIMEDOUT') ||
        fetchError.name === 'AbortError' ||
        fetchError.name === 'TimeoutError'
      )
      
      // Se é erro relacionado a extensão ou global scope, tentar XHR
      if (errorMsg.includes('global scope is shutting down') || 
          errorMsg.includes('NetworkError')) {
        
        // Fetch failed, trying XHR fallback
        
        try {
          // Passar os headers completos para o XHR também
          const xhrResponse = await xhrFetch(url, { ...init, headers })
          
          // Reset connection failure count on XHR success
          connectionFailures = 0
          
          return xhrResponse
        } catch (xhrError) {
          // XHR fallback also failed
          // Continue with retry logic below
        }
      }
      
      // Retry if it's a retryable error and we haven't exceeded max retries
      if (isRetryable && retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000) // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // If not retryable or exceeded retries, throw the error
      throw fetchError
    }
  }
  
  throw new Error(`safeFetch: Falhou após ${maxRetries + 1} tentativas`)
}

// Export connection status for other components to use
export function getConnectionStatus() {
  return {
    isOnline,
    connectionFailures,
    hasRecentFailures: connectionFailures > 0
  }
}

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabase) return supabase
  if (initializing) return initializing

  initializing = (async () => {
    // 1) Tenta ler do window.__PUBLIC_ENV__ (injetado no layout)
    const env: PublicEnv =
      (typeof window !== "undefined" ? (window as any).__PUBLIC_ENV__ : null) || (process as any).env || {}

    let url: string = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ""
    let anon: string = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""

    // 2) Fallback: buscar do backend caso ausente
    if (!url || !anon) {
      const srv = await fetchPublicEnv()
      if (srv) {
        url = srv.url
        anon = srv.anon
      }
    }

    if (!url || !anon) {
      // Supabase public variables missing
    }

    // Armazenar a anon key para usar no safeFetch
    supabaseAnonKey = anon

    supabase = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        // Garante fetch estável com 1 retry em falhas de rede
        fetch: safeFetch as any,
        headers: { "x-application-name": "trafico-dashboard-pro" },
      },
    })

    // Configurar listener para atualizar o token quando a sessão mudar
    supabase.auth.onAuthStateChange((event, session) => {
      updateSessionToken(session?.access_token || null)
    })

    // Obter sessão inicial se existir
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateSessionToken(session?.access_token || null)
    })

    return supabase
  })()

  try {
    return await initializing
  } finally {
    initializing = null
  }
}
