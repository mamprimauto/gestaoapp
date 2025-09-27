"use client"

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    const supabase = getSupabaseClient()

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) {
        setUser(user)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      setUser(session?.user ?? null)
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) {

      throw error
    }
  }

  return { user, loading, signOut }
}