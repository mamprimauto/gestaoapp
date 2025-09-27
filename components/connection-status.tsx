"use client"

import { useEffect, useState } from "react"
import { getConnectionStatus } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff, AlertTriangle } from "lucide-react"

export function ConnectionStatus() {
  const [status, setStatus] = useState({
    isOnline: true,
    connectionFailures: 0,
    hasRecentFailures: false
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check status every 5 seconds
    const interval = setInterval(() => {
      const currentStatus = getConnectionStatus()
      setStatus(currentStatus)
      
      // Show component if offline or has recent failures
      setIsVisible(!currentStatus.isOnline || currentStatus.hasRecentFailures)
    }, 5000)

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus(getConnectionStatus())
      setIsVisible(false)
    }

    const handleOffline = () => {
      setStatus(getConnectionStatus())
      setIsVisible(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    const initialStatus = getConnectionStatus()
    setStatus(initialStatus)
    setIsVisible(!initialStatus.isOnline || initialStatus.hasRecentFailures)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isVisible) return null

  const getStatusInfo = () => {
    if (!status.isOnline) {
      return {
        icon: WifiOff,
        variant: "destructive" as const,
        title: "Sem conexão",
        description: "Você está offline. Algumas funcionalidades podem não estar disponíveis."
      }
    }

    if (status.hasRecentFailures) {
      return {
        icon: AlertTriangle,
        variant: "default" as const,
        title: "Conexão instável",
        description: `Detectadas ${status.connectionFailures} falhas recentes de conexão. Algumas operações podem demorar mais.`
      }
    }

    return {
      icon: Wifi,
      variant: "default" as const,
      title: "Conectado",
      description: "Conexão estável."
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Alert variant={statusInfo.variant}>
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <strong>{statusInfo.title}:</strong> {statusInfo.description}
        </AlertDescription>
      </Alert>
    </div>
  )
}