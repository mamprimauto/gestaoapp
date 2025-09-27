"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type Status = "pending" | "done"
type Priority = "low" | "med" | "high" | null

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  tag: string | null
  owner: string | null
  due_date: string | null
  status: Status
  priority: Priority
  assignee_id?: string | null
  kanban_column?: string | null
  parent_id?: string | null
  variation_type?: 'hook' | 'body' | 'clickbait' | null
  created_at: string
  updated_at: string
}

export type Member = {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
}

type StableCtx = {
  userId: string | null
  tasks: Task[]
  members: Member[]
  loading: boolean
  counts: { doneToday: number; pending: number; progress: number; pct: number }
  toggleStatus: (id: string) => Promise<void>
  addTask: (init?: Partial<Task>) => Promise<Task | null>
  updateTask: (id: string, patch: Partial<Task>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<void>
}

const StableTaskContext = createContext<StableCtx | null>(null)

export function StableTaskDataProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  
  // Estados básicos - sempre na mesma ordem
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Refs sempre na mesma ordem
  const mountedRef = useRef(true)
  const channelRef = useRef<any>(null)

  // Efeito principal - sempre chamado
  useEffect(() => {
    let active = true
    let supabaseRef: any = null

    async function initData() {
      try {
        const supabase = await getSupabaseClient()
        supabaseRef = supabase

        const { data: userResp, error: userErr } = await supabase.auth.getUser()
        
        if (userErr && userErr.name !== 'AuthSessionMissingError') {

        }
        
        const uid = userResp?.user?.id ?? null
        
        if (active) {
          setUserId(uid)
        }

        if (!uid || !active) {
          setTasks([])
          setMembers([])
          setLoading(false)
          return
        }

        // Carregar tarefas
        const { data: taskData, error: taskErr } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })

        if (taskErr) {

          if (active) setTasks([])
        } else if (active) {
          setTasks((taskData as Task[]) || [])
        }

        // Carregar membros
        try {
          const { data: memberData } = await supabase
            .from("profiles")
            .select("id, name, email, avatar_url")
            .limit(50)

          if (active) {
            setMembers((memberData as Member[]) || [])
          }
        } catch (err) {

          if (active) setMembers([])
        }

      } catch (error) {

        if (active) {
          setTasks([])
          setMembers([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    initData()

    return () => {
      active = false
    }
  }, [toast])

  // Counts sempre memoizado
  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const doneToday = tasks.filter((t) => {
      try {
        if (!t || !t.updated_at) return false
        const d = new Date(t.updated_at)
        if (isNaN(d.getTime())) return false
        const dStr = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        return t.status === "done" && dStr === today
      } catch {
        return false
      }
    }).length
    
    const pending = tasks.filter((t) => t && t.status === "pending").length
    const total = tasks.length
    const pct = total > 0 ? Math.round(((total - pending) / total) * 100) : 0
    return { doneToday, pending, total, pct }
  }, [tasks])

  // Funções sempre na mesma ordem
  const toggleStatus = useCallback(async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id)
      if (!task) return

      const newStatus: Status = task.status === "pending" ? "done" : "pending"
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    } catch (error) {

      toast({
        title: "Erro ao atualizar tarefa",
        description: "Falha inesperada",
        variant: "destructive",
      })
    }
  }, [tasks, toast])

  const addTask = useCallback(async (init?: Partial<Task>): Promise<Task | null> => {
    if (!userId) return null
    
    try {
      const supabase = await getSupabaseClient()
      const newTask = {
        user_id: userId,
        title: init?.title || "Nova tarefa",
        description: init?.description || "Descrição breve da tarefa",
        tag: init?.tag || null,
        owner: init?.owner || null,
        due_date: init?.due_date || null,
        status: (init?.status as Status) || "pending",
        priority: init?.priority || "low",
        assignee_id: init?.assignee_id || null,
        kanban_column: init?.kanban_column || null,
        parent_id: init?.parent_id || null,
        variation_type: init?.variation_type || null,
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([newTask])
        .select()
        .single()

      if (error) throw error

      const createdTask = data as Task
      setTasks(prev => [createdTask, ...prev])
      return createdTask
    } catch (error) {

      toast({
        title: "Erro ao criar tarefa",
        description: "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }, [userId, toast])

  const updateTask = useCallback(async (id: string, patch: Partial<Task>): Promise<Task | null> => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from("tasks")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      const updatedTask = data as Task
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t))
      return updatedTask
    } catch (error) {

      toast({
        title: "Erro ao atualizar tarefa",
        description: "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }, [toast])

  const deleteTask = useCallback(async (id: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase.from("tasks").delete().eq("id", id)

      if (error) throw error

      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (error) {

      toast({
        title: "Erro ao excluir tarefa",
        description: "Falha inesperada",
        variant: "destructive",
      })
    }
  }, [toast])

  // Valor do contexto sempre na mesma ordem
  const contextValue = useMemo(() => ({
    userId,
    tasks,
    members,
    loading,
    counts,
    toggleStatus,
    addTask,
    updateTask,
    deleteTask,
  }), [userId, tasks, members, loading, counts, toggleStatus, addTask, updateTask, deleteTask])

  return (
    <StableTaskContext.Provider value={contextValue}>
      {children}
    </StableTaskContext.Provider>
  )
}

export function useStableTaskData() {
  const ctx = useContext(StableTaskContext)
  if (!ctx) throw new Error("useStableTaskData must be used within StableTaskDataProvider")
  return ctx
}