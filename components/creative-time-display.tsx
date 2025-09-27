"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Clock, Loader2 } from "lucide-react"
import { useTimeSync } from "@/hooks/use-time-sync"
interface CreativeTimeDisplayProps {
  taskId: string
  className?: string
  lazy?: boolean // Nova prop para controlar lazy loading
}
export default function CreativeTimeDisplay({ taskId, className = "", lazy = true }: CreativeTimeDisplayProps) {
  const [timeSpent, setTimeSpent] = useState<string>("--:--:--")
  const [loading, setLoading] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(!lazy)
  const [hasLoaded, setHasLoaded] = useState(false)
  const { lastUpdate } = useTimeSync()
  const elementRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  // Debounced fetch function para evitar muitas requisições simultâneas
  const fetchTimeSpent = useCallback(async () => {
    if (!shouldLoad) return
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      // Check if user is authenticated first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        setTimeSpent("-")
        setLoading(false)
        return
      }
      const res = await fetch(`/api/tasks/${taskId}/time/total`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        // Se o tempo for 00:00:00, mostrar apenas "-"
        const formattedTime = data.formatted || "00:00:00"
        setTimeSpent(formattedTime === "00:00:00" ? "-" : formattedTime)
        setHasLoaded(true)
      } else {
        setTimeSpent("-")
      }
    } catch (error) {
      setTimeSpent("-")
    } finally {
      setLoading(false)
    }
  }, [taskId, shouldLoad])
  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!lazy || shouldLoad) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoad) {
            // Pequeno delay aleatório para evitar requisições simultâneas
            const delay = Math.random() * 1000 // 0-1000ms
            setTimeout(() => {
              setShouldLoad(true)
            }, delay)
          }
        })
      },
      { threshold: 0.1 }
    )
    if (elementRef.current) {
      observer.observe(elementRef.current)
    }
    return () => {
      observer.disconnect()
    }
  }, [lazy, shouldLoad])
  // Fetch data when shouldLoad becomes true
  useEffect(() => {
    if (shouldLoad && !hasLoaded) {
      fetchTimeSpent()
    }
  }, [shouldLoad, hasLoaded, fetchTimeSpent])
  // Update interval (apenas quando já carregou)
  useEffect(() => {
    if (shouldLoad && hasLoaded) {
      // Update every 2 minutes to reduce server load
      intervalRef.current = setInterval(fetchTimeSpent, 120000)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [shouldLoad, hasLoaded, fetchTimeSpent])
  
  // Update when timer is started/stopped (via lastUpdate)
  useEffect(() => {
    if (shouldLoad && hasLoaded && lastUpdate > 0) {
      // Fetch immediately when timer state changes
      fetchTimeSpent()
    }
  }, [lastUpdate, shouldLoad, hasLoaded, fetchTimeSpent])
  // Handle manual load trigger
  const handleLoadTime = useCallback(() => {
    if (!shouldLoad) {
      setShouldLoad(true)
    }
  }, [shouldLoad])
  if (loading) {
    return (
      <div 
        ref={elementRef}
        className={`flex items-center gap-1.5 text-white/50 ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">-</span>
      </div>
    )
  }
  return (
    <div 
      ref={elementRef}
      className={`flex items-center gap-1.5 text-white/70 ${className} ${
        !shouldLoad ? 'cursor-pointer hover:text-white/90 transition-colors' : ''
      }`}
      onClick={!shouldLoad ? handleLoadTime : undefined}
      title={!shouldLoad ? "Clique para carregar tempo gasto" : undefined}
    >
      <Clock className="h-3 w-3" />
      <span className="text-xs font-mono">{timeSpent}</span>
    </div>
  )
}