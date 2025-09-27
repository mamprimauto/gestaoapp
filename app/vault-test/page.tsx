'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function VaultTestPage() {
  const { toast } = useToast()
  const [isInitializing, setIsInitializing] = useState(true)
  const [isUnlocked, setIsUnlocked] = useState(false)
  
  useEffect(() => {
    // Simular inicialização
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])
  
  if (isInitializing) {
    return <div>Inicializando...</div>
  }
  
  if (!isUnlocked) {
    return <div>Vault bloqueado</div>
  }
  
  return (
    <div className="min-h-screen bg-background p-6">
      <h1>Vault Test Page</h1>
      <button onClick={() => setIsUnlocked(false)}>Lock Vault</button>
    </div>
  )
}