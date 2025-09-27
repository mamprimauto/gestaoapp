import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface ABTestOption {
  id: string
  option_type: 'test_type' | 'channel'
  value: string
  label: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface CreateOptionData {
  option_type: 'test_type' | 'channel'
  value: string
  label: string
}

interface UpdateOptionData {
  value?: string
  label?: string
  is_active?: boolean
  sort_order?: number
}

export function useABTestOptions() {
  const [options, setOptions] = useState<ABTestOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOptions = useCallback(async (type?: 'test_type' | 'channel') => {
    setLoading(true)
    setError(null)

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      
      if (!session?.session?.access_token) {
        throw new Error('Não autenticado')
      }

      const url = type ? `/api/ab-tests/options?type=${type}` : '/api/ab-tests/options'
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar opções')
      }

      const data = await response.json()
      setOptions(data.options || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createOption = useCallback(async (optionData: CreateOptionData): Promise<ABTestOption> => {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    
    if (!session?.session?.access_token) {
      throw new Error('Não autenticado')
    }

    const response = await fetch('/api/ab-tests/options', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(optionData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar opção')
    }

    const data = await response.json()
    const newOption = data.option

    // Update local state
    setOptions(prev => [...prev, newOption].sort((a, b) => a.sort_order - b.sort_order))
    
    return newOption
  }, [])

  const updateOption = useCallback(async (id: string, updateData: UpdateOptionData): Promise<ABTestOption> => {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    
    if (!session?.session?.access_token) {
      throw new Error('Não autenticado')
    }

    const response = await fetch(`/api/ab-tests/options/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao atualizar opção')
    }

    const data = await response.json()
    const updatedOption = data.option

    // Update local state
    setOptions(prev => prev.map(opt => 
      opt.id === id ? updatedOption : opt
    ).sort((a, b) => a.sort_order - b.sort_order))
    
    return updatedOption
  }, [])

  const deleteOption = useCallback(async (id: string): Promise<void> => {
    const supabase = await getSupabaseClient()
    const { data: session } = await supabase.auth.getSession()
    
    if (!session?.session?.access_token) {
      throw new Error('Não autenticado')
    }

    const response = await fetch(`/api/ab-tests/options/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao excluir opção')
    }

    // Update local state
    setOptions(prev => prev.filter(opt => opt.id !== id))
  }, [])

  // Helper functions to get filtered options
  const getTestTypes = useCallback(() => {
    return options.filter(opt => opt.option_type === 'test_type' && opt.is_active)
  }, [options])

  const getChannels = useCallback(() => {
    return options.filter(opt => opt.option_type === 'channel' && opt.is_active)
  }, [options])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  return {
    options,
    loading,
    error,
    fetchOptions,
    createOption,
    updateOption,
    deleteOption,
    getTestTypes,
    getChannels
  }
}