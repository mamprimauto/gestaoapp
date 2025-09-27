"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Shield, Lock } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {

          router.push('/login')
          return
        }

        // Verificar se o usuário é admin
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, approved')
          .eq('id', user.id)
          .single()

        // Lidar com array ou objeto
        const profile = Array.isArray(profileData) ? profileData[0] : profileData

        if (!profile?.approved) {

          setIsAdmin(false)
        } else if (profile?.role === 'admin' || profile?.role === 'administrador') {

          setIsAdmin(true)
        } else {

          setIsAdmin(false)
        }
      } catch (error) {

        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
        <div className="text-center">
          <Shield className="h-12 w-12 text-white/20 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">
            Acesso Restrito
          </h1>
          <p className="text-white/70 mb-6">
            Esta área é exclusiva para administradores do sistema.
          </p>
          <button
            onClick={() => router.push('/tarefas')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Voltar ao Sistema
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}