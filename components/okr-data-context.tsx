"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useTaskData } from './task-data'

// Types
export interface OKR {
  id: string
  organization_id?: string
  week: number
  year: number
  title: string
  focus: string
  status: 'completed' | 'current' | 'planned'
  created_by?: string
  created_at?: string
  updated_at?: string
  keyResults?: KeyResult[]
}

export interface KeyResult {
  id: string
  okr_id: string
  title: string
  target: number
  current: number
  priority: 'high' | 'medium' | 'low'
  position: number
  created_at?: string
  updated_at?: string
  tasks?: OKRTask[]
  assignees?: string[]
}

export interface OKRTask {
  id: string
  key_result_id: string
  title: string
  completed: boolean
  assignee_id: string
  position: number
  due_date?: string | null
  created_at?: string
  updated_at?: string
}

interface OKRContextType {
  okrs: OKR[]
  loading: boolean
  currentWeek: number
  currentYear: number
  
  // CRUD Operations
  createOKR: (okr: Partial<OKR>) => Promise<OKR | null>
  updateOKR: (id: string, updates: Partial<OKR>) => Promise<boolean>
  deleteOKR: (id: string) => Promise<boolean>
  
  createKeyResult: (okrId: string, kr: Partial<KeyResult>) => Promise<KeyResult | null>
  updateKeyResult: (id: string, updates: Partial<KeyResult>) => Promise<boolean>
  deleteKeyResult: (id: string) => Promise<boolean>
  
  createTask: (krId: string, task: Partial<OKRTask>) => Promise<OKRTask | null>
  updateTask: (id: string, updates: Partial<OKRTask>) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  toggleTaskComplete: (id: string) => Promise<boolean>
  
  updateAssignees: (krId: string, userIds: string[]) => Promise<boolean>
  
  // Drag & Drop Operations
  reorderKeyResults: (okrId: string, sourceIndex: number, destinationIndex: number) => Promise<boolean>
  moveTaskBetweenKRs: (taskId: string, sourceKRId: string, destinationKRId: string, newPosition: number) => Promise<boolean>
  
  // Utils
  getOKRByWeek: (week: number, year?: number) => OKR | undefined
  refreshOKRs: () => Promise<void>
}

const OKRContext = createContext<OKRContextType | null>(null)

export const useOKRData = () => {
  const context = useContext(OKRContext)
  if (!context) {
    throw new Error('useOKRData must be used within OKRDataProvider')
  }
  return context
}

// Sistema iniciará sem dados - usuário criará seus próprios OKRs
const fallbackOKRs: OKR[] = []

export function OKRDataProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const { userId } = useTaskData()
  const [okrs, setOkrs] = useState<OKR[]>(fallbackOKRs)
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState<any>(null)
  const [hasDatabase, setHasDatabase] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Current week and year
  const currentWeek = 33
  const currentYear = 2025

  // Initialize Supabase client
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
      getSupabaseClient().then(client => {
        setSupabase(client)
        checkDatabaseTables(client)
      }).catch(err => {

        setLoading(false)
      })
    }
  }, [isInitialized])

  // Check if OKR tables exist and get organization
  const checkDatabaseTables = async (client: any) => {
    try {
      // Set a default organization ID
      if (userId) {
        setOrganizationId('default-org-' + userId)
      }

      const { error } = await client.from('okrs').select('id').limit(1)
      if (!error) {

        setHasDatabase(true)
        // Load OKRs from database
        await loadOKRs(client)
      } else {

        setHasDatabase(false)
        setOkrs([])
        setLoading(false)
      }
    } catch (err) {

      setOkrs([])
      setLoading(false)
    }
  }

  // Load OKRs from database
  const loadOKRs = async (client: any) => {
    if (!client) return

    try {
      // Load OKRs
      const { data: okrData, error: okrError } = await client
        .from('okrs')
        .select(`
          *,
          key_results (
            *,
            okr_tasks (*),
            okr_assignees (user_id)
          )
        `)
        .order('week', { ascending: true })

      if (okrError) {

        // Use fallback data instead of throwing
        setOkrs([])
        setLoading(false)
        return
      }

      // Format data
      const formattedOKRs = okrData?.map((okr: any) => ({
        ...okr,
        keyResults: okr.key_results?.map((kr: any) => ({
          ...kr,
          tasks: (kr.okr_tasks || []).sort((a: any, b: any) => {
            // Sort tasks by creation date - most recent first
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          }),
          assignees: kr.okr_assignees?.map((a: any) => a.user_id) || []
        })) || []
      })) || []

      setOkrs(formattedOKRs)
      setLoading(false)
    } catch (error) {

      toast({
        title: 'Erro ao carregar OKRs',
        description: 'Usando dados locais',
        variant: 'destructive'
      })
      setOkrs([])
      setLoading(false)
    }
  }

  // Refresh OKRs
  const refreshOKRs = useCallback(async () => {
    if (supabase) {
      await loadOKRs(supabase)
    }
  }, [supabase])

  // Create OKR
  const createOKR = useCallback(async (okr: Partial<OKR>) => {
    // Create a proper OKR object
    const newOKR: OKR = {
      id: `okr-${Date.now()}`,
      week: okr.week || currentWeek,
      year: okr.year || currentYear,
      title: okr.title || 'Novo OKR',
      focus: okr.focus || '',
      status: okr.status || 'planned',
      keyResults: []
    }

    // Always add to local state first
    setOkrs(prev => [...prev, newOKR])

    // Try to save to database if available
    if (supabase && hasDatabase) {
      try {
        // Verificar se o usuário está autenticado
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {

          toast({
            title: 'Erro de Autenticação',
            description: 'Faça login para salvar OKRs',
            variant: 'destructive'
          })
          return newOKR
        }

        const { data, error } = await supabase
          .from('okrs')
          .insert({
            week: newOKR.week,
            year: newOKR.year,
            title: newOKR.title,
            focus: newOKR.focus,
            status: newOKR.status,
            organization_id: organizationId,
            created_by: user.id
          })
          .select()
          .single()

        if (error) {

          toast({
            title: 'Erro ao salvar OKR',
            description: `${error.message} (${error.code})`,
            variant: 'destructive'
          })
          return newOKR
        }

        if (data) {

          // Update local state with real ID from database
          setOkrs(prev => prev.map(o => 
            o.id === newOKR.id ? { ...o, id: data.id } : o
          ))
          await refreshOKRs()
          return data
        }
      } catch (error: any) {

        toast({
          title: 'Erro de Conexão',
          description: 'Não foi possível salvar no banco de dados',
          variant: 'destructive'
        })
        // Keep local version working
      }
    }

    return newOKR
  }, [supabase, hasDatabase, userId, organizationId, currentWeek, currentYear, refreshOKRs, toast])

  // Update OKR
  const updateOKR = useCallback(async (id: string, updates: Partial<OKR>) => {
    // Always update locally first
    setOkrs(prev => prev.map(okr => 
      okr.id === id ? { ...okr, ...updates } : okr
    ))
    
    // Try to save to database if available
    if (supabase && hasDatabase) {
      try {
        const { error } = await supabase
          .from('okrs')
          .update(updates)
          .eq('id', id)

        if (error) {

        } else {

          await refreshOKRs()
        }
      } catch (error: any) {

      }
    } else {

    }
    
    return true
  }, [supabase, hasDatabase, refreshOKRs])

  // Delete OKR
  const deleteOKR = useCallback(async (id: string) => {
    // Always do local operation first
    setOkrs(prev => prev.filter(okr => okr.id !== id))
    
    // If no database, just return success
    if (!supabase || !hasDatabase) {

      return true
    }

    try {
      const { error } = await supabase
        .from('okrs')
        .delete()
        .eq('id', id)

      if (error) {

        // Don't throw - local delete already succeeded
      } else {
        await refreshOKRs()
      }
      return true
    } catch (error: any) {

      // Don't show toast for database errors when working locally
      return true // Local operation succeeded
    }
  }, [supabase, hasDatabase, refreshOKRs])

  // Create Key Result
  const createKeyResult = useCallback(async (okrId: string, kr: Partial<KeyResult>) => {
    if (!supabase || !hasDatabase) {
      // Local operation
      const newKR: KeyResult = {
        id: `kr-${Date.now()}`,
        okr_id: okrId,
        title: kr.title || 'Novo Key Result',
        target: kr.target || 10,
        current: kr.current || 0,
        priority: kr.priority || 'medium',
        position: kr.position || 0,
        tasks: [],
        assignees: []
      }
      
      setOkrs(prev => prev.map(okr => 
        okr.id === okrId 
          ? { ...okr, keyResults: [...(okr.keyResults || []), newKR] }
          : okr
      ))
      return newKR
    }

    try {
      const { data, error } = await supabase
        .from('key_results')
        .insert({
          ...kr,
          okr_id: okrId
        })
        .select()
        .single()

      if (error) throw error
      
      await refreshOKRs()
      return data
    } catch (error: any) {
      toast({
        title: 'Erro ao criar Key Result',
        description: error.message,
        variant: 'destructive'
      })
      return null
    }
  }, [supabase, hasDatabase, refreshOKRs, toast])

  // Update Key Result
  const updateKeyResult = useCallback(async (id: string, updates: Partial<KeyResult>) => {
    // Always update locally first
    setOkrs(prev => prev.map(okr => ({
      ...okr,
      keyResults: okr.keyResults?.map(kr => 
        kr.id === id ? { ...kr, ...updates } : kr
      )
    })))
    
    // Try to save to database if available
    if (supabase && hasDatabase) {
      try {
        const { error } = await supabase
          .from('key_results')
          .update(updates)
          .eq('id', id)

        if (error) {

        } else {

          await refreshOKRs()
        }
      } catch (error: any) {

      }
    } else {

    }
    
    return true
  }, [supabase, hasDatabase, refreshOKRs])

  // Delete Key Result
  const deleteKeyResult = useCallback(async (id: string) => {
    // Always do local operation first
    setOkrs(prev => prev.map(okr => ({
      ...okr,
      keyResults: okr.keyResults?.filter(kr => kr.id !== id)
    })))
    
    // If no database, just return success
    if (!supabase || !hasDatabase) {

      return true
    }

    try {
      const { error } = await supabase
        .from('key_results')
        .delete()
        .eq('id', id)

      if (error) {

        // Don't throw - local delete already succeeded
      } else {
        await refreshOKRs()
      }
      return true
    } catch (error: any) {

      // Don't show toast for database errors when working locally
      return true // Local operation succeeded
    }
  }, [supabase, hasDatabase, refreshOKRs])

  // Helper function to get today's date in Brazil timezone
  const getTodayDateBrazil = useCallback(() => {
    const today = new Date()
    const brazilTime = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    return brazilTime.toISOString().split('T')[0]
  }, [])

  // Create Task
  const createTask = useCallback(async (krId: string, task: Partial<OKRTask>) => {
    if (!supabase || !hasDatabase) {
      // Local operation
      const newTask: OKRTask = {
        id: `t-${Date.now()}`,
        key_result_id: krId,
        title: task.title || 'Nova tarefa',
        completed: task.completed || false,
        assignee_id: task.assignee_id || userId || '',
        position: task.position || 0,
        due_date: task.due_date || getTodayDateBrazil(), // Default to today in Brazil timezone
        created_at: new Date().toISOString()
      }
      
      setOkrs(prev => prev.map(okr => ({
        ...okr,
        keyResults: okr.keyResults?.map(kr => 
          kr.id === krId 
            ? { 
                ...kr, 
                tasks: [newTask, ...(kr.tasks || [])].sort((a, b) => {
                  // Sort tasks by creation date - most recent first
                  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                })
              }
            : kr
        )
      })))
      return newTask
    }

    try {
      const { data, error } = await supabase
        .from('okr_tasks')
        .insert({
          ...task,
          key_result_id: krId,
          due_date: task.due_date || getTodayDateBrazil() // Default to today in Brazil timezone
        })
        .select()
        .single()

      if (error) throw error
      
      await refreshOKRs()
      return data
    } catch (error: any) {
      toast({
        title: 'Erro ao criar tarefa',
        description: error.message,
        variant: 'destructive'
      })
      return null
    }
  }, [supabase, hasDatabase, userId, refreshOKRs, toast, getTodayDateBrazil])

  // Update Task
  const updateTask = useCallback(async (id: string, updates: Partial<OKRTask>) => {
    if (!supabase || !hasDatabase) {
      // Local operation
      setOkrs(prev => prev.map(okr => ({
        ...okr,
        keyResults: okr.keyResults?.map(kr => ({
          ...kr,
          tasks: kr.tasks?.map(task => 
            task.id === id ? { ...task, ...updates } : task
          )
        }))
      })))
      return true
    }

    try {
      const { error } = await supabase
        .from('okr_tasks')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      await refreshOKRs()
      return true
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: error.message,
        variant: 'destructive'
      })
      return false
    }
  }, [supabase, hasDatabase, refreshOKRs, toast])

  // Delete Task
  const deleteTask = useCallback(async (id: string) => {
    // Always do local operation first
    setOkrs(prev => prev.map(okr => ({
      ...okr,
      keyResults: okr.keyResults?.map(kr => ({
        ...kr,
        tasks: kr.tasks?.filter(task => task.id !== id)
      }))
    })))
    
    // If no database, just return success
    if (!supabase || !hasDatabase) {

      return true
    }

    try {
      const { error } = await supabase
        .from('okr_tasks')
        .delete()
        .eq('id', id)

      if (error) {

        // Don't throw - local delete already succeeded
      } else {
        await refreshOKRs()
      }
      return true
    } catch (error: any) {

      // Don't show toast for database errors when working locally
      return true // Local operation succeeded
    }
  }, [supabase, hasDatabase, refreshOKRs])

  // Toggle Task Complete
  const toggleTaskComplete = useCallback(async (id: string) => {
    // Find the task to get its current state
    let currentCompleted = false
    okrs.forEach(okr => {
      okr.keyResults?.forEach(kr => {
        const task = kr.tasks?.find(t => t.id === id)
        if (task) currentCompleted = task.completed
      })
    })

    return updateTask(id, { completed: !currentCompleted })
  }, [okrs, updateTask])

  // Update Assignees
  const updateAssignees = useCallback(async (krId: string, userIds: string[]) => {
    if (!supabase || !hasDatabase) {
      // Local operation
      setOkrs(prev => prev.map(okr => ({
        ...okr,
        keyResults: okr.keyResults?.map(kr => 
          kr.id === krId ? { ...kr, assignees: userIds } : kr
        )
      })))
      return true
    }

    try {
      // Delete existing assignees
      await supabase
        .from('okr_assignees')
        .delete()
        .eq('key_result_id', krId)

      // Insert new assignees
      if (userIds.length > 0) {
        const { error } = await supabase
          .from('okr_assignees')
          .insert(
            userIds.map(userId => ({
              key_result_id: krId,
              user_id: userId
            }))
          )

        if (error) throw error
      }
      
      await refreshOKRs()
      return true
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar responsáveis',
        description: error.message,
        variant: 'destructive'
      })
      return false
    }
  }, [supabase, hasDatabase, refreshOKRs, toast])

  // Get OKR by week
  // Reorder Key Results
  const reorderKeyResults = useCallback(async (okrId: string, sourceIndex: number, destinationIndex: number) => {
    // Update local state first
    setOkrs(prev => prev.map(okr => {
      if (okr.id === okrId && okr.keyResults) {
        const newKeyResults = [...okr.keyResults]
        const [removed] = newKeyResults.splice(sourceIndex, 1)
        newKeyResults.splice(destinationIndex, 0, removed)
        
        // Update positions
        const updatedKeyResults = newKeyResults.map((kr, index) => ({
          ...kr,
          position: index
        }))
        
        return { ...okr, keyResults: updatedKeyResults }
      }
      return okr
    }))
    
    // Try to save to database if available
    if (supabase && hasDatabase) {
      try {
        const okr = okrs.find(o => o.id === okrId)
        if (okr?.keyResults) {
          const keyResults = [...okr.keyResults]
          const [removed] = keyResults.splice(sourceIndex, 1)
          keyResults.splice(destinationIndex, 0, removed)
          
          // Update positions in database
          const updates = keyResults.map((kr, index) => 
            supabase
              .from('key_results')
              .update({ position: index })
              .eq('id', kr.id)
          )
          
          await Promise.all(updates)

        }
      } catch (error: any) {

      }
    }
    
    return true
  }, [supabase, hasDatabase, okrs])

  // Move Task Between Key Results
  const moveTaskBetweenKRs = useCallback(async (taskId: string, sourceKRId: string, destinationKRId: string, newPosition: number) => {
    // Update local state first
    setOkrs(prev => prev.map(okr => ({
      ...okr,
      keyResults: okr.keyResults?.map(kr => {
        if (kr.id === sourceKRId) {
          // Remove task from source KR
          return {
            ...kr,
            tasks: kr.tasks?.filter(task => task.id !== taskId) || []
          }
        } else if (kr.id === destinationKRId) {
          // Add task to destination KR
          const taskToMove = okrs
            .flatMap(o => o.keyResults || [])
            .flatMap(k => k.tasks || [])
            .find(t => t.id === taskId)
          
          if (taskToMove) {
            const updatedTask = {
              ...taskToMove,
              key_result_id: destinationKRId,
              position: newPosition
            }
            
            const newTasks = [...(kr.tasks || [])]
            newTasks.splice(newPosition, 0, updatedTask)
            
            return {
              ...kr,
              tasks: newTasks.map((task, index) => ({
                ...task,
                position: index
              }))
            }
          }
        }
        return kr
      })
    })))
    
    // Try to save to database if available
    if (supabase && hasDatabase) {
      try {
        const { error } = await supabase
          .from('okr_tasks')
          .update({
            key_result_id: destinationKRId,
            position: newPosition
          })
          .eq('id', taskId)
          
        if (error) {

        } else {

          await refreshOKRs()
        }
      } catch (error: any) {

      }
    }
    
    return true
  }, [supabase, hasDatabase, okrs, refreshOKRs])

  const getOKRByWeek = useCallback((week: number, year?: number) => {
    return okrs.find(okr => 
      okr.week === week && okr.year === (year || currentYear)
    )
  }, [okrs, currentYear])

  // Realtime disabled - causing issues
  // Setup realtime subscription (commented out for now)
  // useEffect(() => {
  //   if (!supabase || !hasDatabase) return
  //   const channel = supabase.channel('okr-changes')...
  //   return () => { supabase.removeChannel(channel) }
  // }, [supabase, hasDatabase, refreshOKRs])

  const value = {
    okrs,
    loading,
    currentWeek,
    currentYear,
    createOKR,
    updateOKR,
    deleteOKR,
    createKeyResult,
    updateKeyResult,
    deleteKeyResult,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    updateAssignees,
    reorderKeyResults,
    moveTaskBetweenKRs,
    getOKRByWeek,
    refreshOKRs
  }

  return (
    <OKRContext.Provider value={value}>
      {children}
    </OKRContext.Provider>
  )
}