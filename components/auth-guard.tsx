"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let active = true
    
    // Watchdog: garante que o loading não fica infinito
    const timeout = setTimeout(() => {
      if (!active) return

      setChecking(false)
      router.replace("/login")
    }, 8000) // 8s

    async function checkAuth() {
      try {
        const supabase = await getSupabaseClient()
        
        // Verificar sessão atual
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (!active) return
        
        if (sessionError) {

          setChecking(false)
          router.replace("/login")
          return
        }

        if (!sessionData.session) {

          setChecking(false)
          router.replace("/login")
          return
        }

        // Verificar se o usuário ainda é válido
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (!active) return
        
        if (userError || !userData.user) {

          setChecking(false)
          router.replace("/login")
          return
        }

        // Usuário autenticado com sucesso

        setIsAuthenticated(true)
        setChecking(false)
        
      } catch (error) {

        if (!active) return
        setChecking(false)
        router.replace("/login")
      } finally {
        clearTimeout(timeout)
      }
    }

    // Configurar listener para mudanças de autenticação
    const setupAuthListener = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!active) return

            if (event === 'SIGNED_OUT' || !session) {
              setIsAuthenticated(false)
              setChecking(false)
              router.replace("/login")
            } else if (event === 'SIGNED_IN' && session) {
              setIsAuthenticated(true)
              setChecking(false)
            }
          }
        )
        
        return () => subscription.unsubscribe()
      } catch (error) {

      }
    }

    checkAuth()
    const unsubscribe = setupAuthListener()

    return () => {
      active = false
      clearTimeout(timeout)
      unsubscribe?.then(unsub => unsub?.())
    }
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will be redirected by the effect
  }

  return <>{children}</>
}
