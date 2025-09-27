"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  getNextVariationNumber, 
  createVariationData, 
  generateVariationTitle,
  getNextCreativeNumber, 
  generateCreativeNomenclature,
  getNextReeditionNumber 
} from '@/lib/products'

type Status = "pending" | "done"  // Simplified status for task completion control
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
  assignee_id?: string | null // opcional para compatibilidade
  kanban_column?: string | null // coluna do kanban
  // Organization system removed - tasks are now user-based
  parent_id?: string | null // ID do criativo principal para variações
  variation_type?: 'hook' | 'body' | 'clickbait' | null // tipo de variação
  // Cross-department task linking
  linked_task_id?: string | null // ID da tarefa linkada em outro departamento
  request_type?: 'sent' | 'received' | null // tipo da solicitação cross-department
  // Task groups
  group_id?: string | null // ID do grupo de tarefas
  created_at: string
  updated_at: string
}

export type Member = {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  role?: string | null
}

export type KanbanColumn = {
  id: string
  column_id: string
  workspace_id: string
  title: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export type TaskGroup = {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  icon: string
  position: number
  created_at: string
  updated_at: string
}

type Ctx = {
  userId: string | null
  tasks: Task[]
  members: Member[]
  taskGroups: TaskGroup[]
  loading: boolean
  counts: { doneToday: number; pending: number; progress: number; pct: number }
  getPersonalCounts: (selectedDate?: string) => { doneToday: number; pending: number; progress: number; pct: number }
  toggleStatus: (id: string) => Promise<void>
  addTask: (init?: Partial<Task>) => Promise<Task | null>
  addExamples: () => Promise<void>
  updateTask: (id: string, patch: Partial<Task>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<void>
  createVariation: (parentTaskId: string, variationType: 'hook' | 'body' | 'clickbait') => Promise<Task | null>
  createVariationFromVariation: (variationTaskId: string, newVariationType: 'hook' | 'body' | 'clickbait' | 'edicao') => Promise<Task | null>
  duplicateTask: (taskId: string) => Promise<Task | null>
  createReedition: (taskId: string) => Promise<Task | null>
  addComment: (taskId: string, content: string) => Promise<void>
  deleteComment: (taskId: string, commentId: string) => Promise<void>
  // Cross-department functions
  createLinkedTasks: (params: { targetDepartment: string; targetDepartmentName: string; title: string; dueDate?: string; assigneeIds?: string[]; priority?: string }) => Promise<{ sentTask: Task; receivedTask: Task }>
  // Kanban functions
  getKanbanColumns: (workspaceId: string) => Promise<KanbanColumn[]>
  createKanbanColumn: (workspaceId: string, columnData: { column_id: string; title: string; color: string; position: number }) => Promise<KanbanColumn | null>
  updateKanbanColumn: (workspaceId: string, columnId: string, updates: Partial<Pick<KanbanColumn, 'title' | 'color' | 'position'>>) => Promise<KanbanColumn | null>
  deleteKanbanColumn: (workspaceId: string, columnId: string) => Promise<void>
  // Task group functions
  getTaskGroups: () => Promise<TaskGroup[]>
  createTaskGroup: (groupData: { name: string; description?: string; color?: string; icon?: string }) => Promise<TaskGroup | null>
  updateTaskGroup: (groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'description' | 'color' | 'icon'>>) => Promise<TaskGroup | null>
  deleteTaskGroup: (groupId: string) => Promise<void>
  moveTaskGroup: (groupId: string, newPosition: number) => Promise<void>
  getTasksByGroup: (groupId: string | null) => Task[]
}

const TaskDataContext = createContext<Ctx | null>(null)

// Polyfill requestIdleCallback
const ric: typeof window.requestIdleCallback =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? window.requestIdleCallback.bind(window)
    : (((cb: IdleRequestCallback) =>
        setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as any), 0)) as any)
const cic: typeof window.cancelIdleCallback =
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? window.cancelIdleCallback.bind(window)
    : (((id: any) => clearTimeout(id)) as any)

export function TaskDataProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Flag dinâmica para saber se a tabela possui a coluna assignee_id
  const supportsAssignee = useRef(false)
  // Contador para evitar numeração duplicada em criações rápidas
  const reeditionCounters = useRef<Map<string, number>>(new Map())

  // Função corrigida para obter próximo número de reedição
  function getNextSafeReeditionNumber(originalTask: Task): number {
    try {
      const originalData = JSON.parse(originalTask.description || '{}')
      
      // Determinar o criativo base para buscar todas as reedições
      const baseCreativeId = originalData._parent_id || originalTask.id
      const isOriginalAVariation = !!originalData._parent_id

      // Buscar todas as tasks que são reedições desta base
      const allReeditions = tasks.filter(task => {
        if (task.id === originalTask.id) return true // Incluir a própria task original
        
        try {
          const parsed = JSON.parse(task.description || '{}')
          
          if (isOriginalAVariation) {
            // Se estamos criando reedição de uma variação, buscar outras variações do mesmo tipo e pai
            return (
              parsed._parent_id === baseCreativeId && 
              parsed._variation_type === originalData._variation_type
            )
          } else {
            // Se estamos criando reedição do criativo principal, buscar suas reedições diretas
            return (
              parsed._parent_id === baseCreativeId && 
              parsed._variation_type === 'edicao'
            ) || task.id === baseCreativeId // incluir o próprio pai
          }
        } catch {
          return false
        }
      })
      
      // Encontrar o maior número de reedição existente
      const maxReeditionNumber = allReeditions.reduce((max, task) => {
        try {
          const parsed = JSON.parse(task.description || '{}')
          const num = parsed.numero_edicao || 0
          return Math.max(max, num)
        } catch {
          return max
        }
      }, 0)
      
      const nextNumber = maxReeditionNumber + 1

      return nextNumber
    } catch (err) {

      return 1
    }
  }

  // Função para duplicar uma variação como cópia exata (sem incrementar números)
  async function duplicateVariationExact(originalTask: Task): Promise<Task | null> {

    try {
      // Criar data para o dia seguinte
      const now = new Date()
      const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
      const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]

      // Payload idêntico, apenas mudando IDs e datas
      const payload: any = {
        user_id: userId,
        title: originalTask.title, // Título idêntico
        description: originalTask.description, // Dados idênticos
        tag: originalTask.tag,
        owner: originalTask.owner,
        due_date: tomorrowISO, // Data amanhã
        status: "pending" as Status,
        priority: originalTask.priority,
        assignee_id: originalTask.assignee_id,
      }

      if (!supportsAssignee.current) {
        delete payload.assignee_id
      }

      const supabase = await getSupabaseClient()
      
      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload)
      
      if (insertError) {

        toast({
          title: "Erro ao duplicar",
          description: insertError.message || "Falha inesperada",
          variant: "destructive",
        })
        return null
      }
      
      // INSERT funcionou, buscar a task criada
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .eq("title", payload.title)
        .order("created_at", { ascending: false })
        .limit(1)
      
      const created = Array.isArray(data) ? data[0] as Task : data as Task
      
      if (!created) {

        toast({
          title: "Erro ao duplicar",
          description: "Variação criada mas não foi possível recuperá-la",
          variant: "destructive",
        })
        return null
      }
      
      // Enriquecer com dados de variação (se existir)
      const enrichedTask = {
        ...created,
        parent_id: originalTask.parent_id,
        variation_type: originalTask.variation_type
      }
      
      // Duplicar arquivos de forma assíncrona
      setTimeout(async () => {
        try {
          const { data: originalFiles } = await supabase
            .from("task_files")
            .select("*")
            .eq("task_id", originalTask.id)
            .limit(10)
          
          if (originalFiles && originalFiles.length > 0) {
            const newFileRecords = originalFiles.map(file => ({
              task_id: created.id,
              file_name: file.file_name,
              content_type: file.content_type,
              file_size: file.file_size,
              path: file.path,
              file_category: file.file_category,
              uploaded_by: userId
            }))
            
            await supabase.from("task_files").insert(newFileRecords)
          }
        } catch (fileError) {

        }
      }, 100)

      // Duplicar comentários de forma assíncrona  
      setTimeout(async () => {
        try {
          const { data: sess } = await supabase.auth.getSession()
          const jwt = sess.session?.access_token
          if (jwt) {
            const commentsResponse = await fetch(`/api/tasks/${originalTask.id}/comments`, {
              headers: { Authorization: `Bearer ${jwt}` },
            })
            
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json()
              const comments = commentsData.comments || []
              
              for (const comment of comments.filter(c => c.content?.trim() || c.image_url)) {
                await fetch(`/api/tasks/${created.id}/comments`, {
                  method: 'POST',
                  headers: { 
                    Authorization: `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    content: comment.content,
                    image_url: comment.image_url
                  })
                })
              }
            }
          }
        } catch (commentError) {

        }
      }, 200)
      
      setTasks((prev) => [enrichedTask as Task, ...prev])

      toast({
        title: "Variação duplicada!",
        description: "Cópia exata criada com sucesso!"
      })

      return enrichedTask as Task
    } catch (err: any) {

      toast({
        title: "Erro ao duplicar",
        description: err.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  // Função para criar variação a partir de uma variação existente
  async function createVariationFromVariation(variationTaskId: string, newVariationType: 'hook' | 'body' | 'clickbait' | 'edicao'): Promise<Task | null> {

    try {
      // Encontrar a variação original
      const variationTask = tasks.find(t => t.id === variationTaskId)
      if (!variationTask) {
        toast({ title: "Erro", description: "Variação não encontrada." })
        return null
      }

      // Extrair dados da variação
      const variationData = JSON.parse(variationTask.description || '{}')
      
      // Encontrar o criativo pai
      const parentTaskId = variationData._parent_id
      if (!parentTaskId) {
        toast({ title: "Erro", description: "Criativo pai não encontrado." })
        return null
      }

      const parentTask = tasks.find(t => t.id === parentTaskId)
      if (!parentTask) {
        toast({ title: "Erro", description: "Criativo pai não encontrado na lista." })
        return null
      }

      // Criar nova variação usando o criativo pai
      return await createVariation(parentTaskId, newVariationType)
      
    } catch (err: any) {

      toast({
        title: "Erro ao criar variação",
        description: err.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  useEffect(() => {
    let active = true
    let idleId: number | null = null
    let supabaseRef: any = null
    let channel: any = null
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        supabaseRef = supabase

        const { data: userResp, error: userErr } = await supabase.auth.getUser()
        
        // Só loga erro se não for erro de sessão ausente
        if (userErr && userErr.name !== 'AuthSessionMissingError') {

        }
        
        const uid = userResp?.user?.id ?? null
        setUserId(uid)

        if (!uid) {
          if (active) {
            setTasks([])
            setMembers([])
            setLoading(false)
          }
          return
        }

        // Carrega todas as tasks (colaborativo - todos veem tudo)

        const { data: taskData, error: taskErr } = await supabase
          .from("tasks")
          .select(`
            *,
            comments:task_comments(
              id,
              content,
              created_at,
              user_id,
              user:profiles!user_id(
                id,
                name,
                email,
                avatar_url
              )
            )
          `)
          // Removido .eq("user_id", uid) para tornar colaborativo
          .order("created_at", { ascending: false })

        if (taskErr) {

          toast({
            title: "Erro ao carregar tarefas",
            description: taskErr.message || "Falha inesperada",
            variant: "destructive",
          })
        } else if (active) {
          const rows = (taskData as any[]) ?? []
          
          // Debug: Log de tarefas carregadas

          const criativosCount = rows.filter(t => t.tag === 'criativos').length

          // Debug: Log de comentários
          const tasksWithComments = rows.filter(t => t.comments && t.comments.length > 0)

          if (tasksWithComments.length > 0) {

          }
          
          if (criativosCount > 0) {

          }
          
          // Enriquecer tasks com dados de variação - priorizar colunas do banco sobre JSON
          const enrichedRows = rows.map(task => {
            try {
              const desc = JSON.parse(task.description || '{}')
              
              // Priorizar dados das colunas do banco sobre JSON legacy
              const parent_id = task.parent_id || desc._parent_id || null
              const variation_type = task.variation_type || desc._variation_type || null
              
              return {
                ...task,
                parent_id,
                variation_type,
                comments: task.comments || []
              }
            } catch {
              // Em caso de erro no JSON, usar apenas dados das colunas do banco
              return {
                ...task,
                parent_id: task.parent_id || null,
                variation_type: task.variation_type || null,
                comments: task.comments || []
              }
            }
          })
          
          // Filter out any null/undefined tasks before setting state
          const validTasks = enrichedRows.filter(task => task && task.id) as Task[]
          setTasks(validTasks)

          // Detecta presença da coluna assignee_id a partir das linhas
          const hasAssignee = rows.length > 0 ? Object.prototype.hasOwnProperty.call(rows[0], "assignee_id") : false
          supportsAssignee.current = hasAssignee
        }

        // Carrega membros (profiles) com fallbacks robustos
        try {

          // Estratégia 1: Tentar buscar todos os profiles
          let { data: mem, error: memErr } = await supabase
            .from("profiles")
            .select("id, name, email, avatar_url, role")
            .order("name", { ascending: true })
          
          // Se retornou vazio ou erro, tentar fallbacks
          if (memErr || !mem || mem.length === 0) {

            // Estratégia 2: Tentar buscar apenas próprio profile
            const { data: userResp2 } = await supabase.auth.getUser()
            if (userResp2?.user?.id) {

              const { data: selfProfile, error: selfErr } = await supabase
                .from("profiles")
                .select("id, name, email, avatar_url, role")
                .eq("id", userResp2.user.id)
                .maybeSingle()
              
              if (!selfErr && selfProfile) {
                mem = [selfProfile]
                memErr = null

              }
            }
            
            // Estratégia 3: Usar profiles conhecidos do banco (temporário até RLS ser corrigido)
            if (!mem || mem.length === 0) {

              // Dados reais do banco obtidos via service role (UUIDs reais)
              mem = [
                { 
                  id: '4684659c-87df-4391-8481-2fd0134611a5', 
                  name: 'Demo TrafficPro', 
                  email: 'demo@trafficpro.local', 
                  avatar_url: '/minimal-avatar.png' 
                },
                { 
                  id: 'c9e6de2d-a0e9-48b9-8880-694b77bba330', 
                  name: 'Spectrum Digital', 
                  email: 'spectrumdigitalbr@gmail.com', 
                  avatar_url: '/minimal-avatar.png' 
                },
                { 
                  id: 'f3f3ebbe-b466-4afd-afef-0339ab05bc22', 
                  name: 'IGOR ZIMPEL', 
                  email: 'igorzimpel@gmail.com', 
                  avatar_url: '/minimal-avatar.png' 
                },
                { 
                  id: '1513f72a-f259-42ca-9624-2436bae7d188', 
                  name: 'Igor Xiles', 
                  email: 'igorxiles@gmail.com', 
                  avatar_url: '/minimal-avatar.png' 
                }
              ]
              memErr = null

            }
          }

          if (memErr) {

            // Tentar diagnosticar o problema
            try {
              const { data: userResp2 } = await supabase.auth.getUser()

              // Tentar buscar apenas o próprio profile
              const { data: selfProfile, error: selfErr } = await supabase
                .from("profiles")
                .select("id, name, email")
                .eq("id", userResp2?.user?.id)
                .maybeSingle()
              
              if (selfErr) {

              } else {

              }
              
              // Organization system removed - using user-based task management
              
            } catch (diagErr) {

            }
            
            if (active) setMembers([])
          } else if (active) {
            const list: Member[] =
              (mem as any[])?.map((r) => ({
                id: r.id,
                name: r.name ?? null,
                email: r.email ?? null,
                avatar_url: r.avatar_url ?? null,
              })) ?? []

            setMembers(list)
          }
        } catch (memCatch) {

          if (active) setMembers([])
        }

        // Realtime das tasks colaborativo (sem filtro de user_id para receber todas as tarefas)
        idleId = ric(() => {
          try {
            channel = supabase
              .channel("tasks-changes-collaborative")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tasks" }, // Removido o filtro para modo colaborativo
                (payload) => {
                  if (!active) return
                  console.log("🔄 Realtime update recebido:", payload.eventType, payload.new || payload.old)
                  
                  if (payload.eventType === "INSERT") {
                    setTasks((prev) => {
                      const newTask = payload.new as Task
                      // Check if task already exists (prevent duplicate from optimistic UI)
                      if (prev.find(t => t.id === newTask.id)) {
                        console.log("⚠️ Tarefa já existe no estado, ignorando duplicata:", newTask.id)
                        return prev // Task already exists, don't add duplicate
                      }
                      console.log("✅ Adicionando nova tarefa via realtime:", newTask.title, newTask.tag)
                      return [newTask, ...prev]
                    })
                  } else if (payload.eventType === "UPDATE") {
                    setTasks((prev) => prev.map((t) => (t.id === (payload.new as any).id ? (payload.new as Task) : t)))
                  } else if (payload.eventType === "DELETE") {
                    setTasks((prev) => prev.filter((t) => t.id !== (payload.old as any).id))
                  }
                },
              )
              .subscribe()
          } catch (e) {

          }
        })
      } catch (err: any) {

        toast({
          title: "Erro de inicialização",
          description: err?.message || "Falha ao iniciar provider de tarefas",
          variant: "destructive",
        })
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
      if (idleId) cic(idleId as any)
      if (supabaseRef && channel) {
        try {
          supabaseRef.removeChannel(channel)
        } catch {}
      }
    }
  }, [toast])

  const counts = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const doneToday = tasks.filter((t) => {
      try {
        if (!t || !t.updated_at) return false
        const d = new Date(t.updated_at)
        if (isNaN(d.getTime())) return false // Validar se é uma data válida
        const dStr = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        return t.status === "done" && dStr === todayStr
      } catch (error) {

        return false
      }
    }).length
    const pending = tasks.filter((t) => t && t.status === "pending").length
    const total = tasks.length
    const pct = total > 0 ? Math.round(((total - pending) / total) * 100) : 0
    return { doneToday, pending, total, pct }
  }, [tasks])

  const getPersonalCounts = (selectedDate?: string) => {
    if (!userId) return { doneToday: 0, pending: 0, progress: 0, pct: 0 }
    
    const targetDate = selectedDate || new Date().toISOString().slice(0, 10)
    
    // Filtrar apenas tasks atribuídas ao usuário atual
    const personalTasks = tasks.filter((t) => {
      // Verifica se a task é atribuída ao usuário (assignee_id) ou criada por ele (user_id)
      const isAssigned = t.assignee_id === userId || t.user_id === userId
      return isAssigned
    })
    
    // Filtrar por data (due_date ou updated_at para tasks concluídas)
    const doneToday = personalTasks.filter((t) => {
      try {
        if (t.status !== "done") return false
        if (!t.updated_at) return false
        const d = new Date(t.updated_at)
        if (isNaN(d.getTime())) return false // Validar se é uma data válida
        const dStr = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        return dStr === targetDate
      } catch (error) {

        return false
      }
    }).length
    
    const pending = personalTasks.filter((t) => {
      if (t.status !== "pending") return false
      // Se tem due_date, verifica se é para a data selecionada. Se não tem, considera como "para hoje"
      const dueDate = t.due_date || targetDate
      return dueDate === targetDate
    }).length
    
    const totalForDate = pending
    const completedForDate = doneToday
    const totalWithCompleted = totalForDate + completedForDate
    const pct = totalWithCompleted > 0 ? Math.round((completedForDate / totalWithCompleted) * 100) : 0
    
    return { doneToday, pending, total: totalWithCompleted, pct }
  }

  function sanitizePatch(patch: Partial<Task>): Record<string, any> {
    const safe: Record<string, any> = { ...patch }
    if (!supportsAssignee.current) delete safe.assignee_id
    return safe
  }

  async function updateTask(id: string, patch: Partial<Task>): Promise<Task | null> {
    const originalTask = tasks.find(t => t.id === id)
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount <= maxRetries) {
      try {
        const supabase = await getSupabaseClient()
        let safePatch = sanitizePatch(patch)

        // 🔧 PRESERVAR METADADOS DE VARIAÇÃO
        // Se estamos atualizando o description e a task original tem metadados de variação, preservá-los
        if (safePatch.description) {
          if (originalTask?.description) {
            try {
              const originalDesc = JSON.parse(originalTask.description)
              const newDesc = JSON.parse(safePatch.description)
              
              // Se a task original tem metadados de variação, preservá-los
              if (originalDesc._is_variation) {
                if (process.env.NODE_ENV === 'development') {

                }
                const preservedDesc = {
                  ...newDesc,
                  _parent_id: originalDesc._parent_id,
                  _variation_type: originalDesc._variation_type,
                  _is_variation: originalDesc._is_variation
                }
                safePatch = {
                  ...safePatch,
                  description: JSON.stringify(preservedDesc)
                }
                if (process.env.NODE_ENV === 'development') {

                }
              }
            } catch (parseError) {

              // Continua com a atualização normal se houver erro no parsing
            }
          }
        }

        // Otimista apenas na primeira tentativa
        if (retryCount === 0) {
          setTasks((prev) => prev.map((t) => (t.id === id ? ({ ...t, ...safePatch } as Task) : t)))
        }

        // IMPORTANTE: Garantir que owner, tag e comments sejam sempre retornados
        const { data: dataRaw, error } = await supabase
          .from("tasks")
          .update(safePatch)
          .eq("id", id)
          .select(`
            *,
            owner,
            tag,
            comments:task_comments(
              id,
              content,
              created_at,
              user:profiles!task_comments_user_id_fkey(
                id,
                email,
                name,
                avatar_url
              )
            )
          `)
        
        // Tratar resultado como array ou objeto único
        let data = null
        if (dataRaw) {
          if (Array.isArray(dataRaw)) {
            data = dataRaw.length > 0 ? dataRaw[0] : null
          } else {
            data = dataRaw
          }
        }
        
        // Debug log para entender o que está sendo retornado

        if (error) {

          // Se é um erro de rede ou temporário, tentar novamente
          if (error.code === 'PGRST116' || error.message?.includes('network') || 
              error.message?.includes('timeout') || error.message?.includes('fetch')) {
            retryCount++
            if (retryCount <= maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000) // Exponential backoff, max 5s

              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          }
          
          // Reverter otimistic update se falhou definitivamente
          if (originalTask) {
            setTasks((prev) => prev.map((t) => (t.id === id ? originalTask : t)))
          }
          return null
        }
        
        if (data && data.id) {
          // Enriquecer o retorno com dados de variação - priorizar colunas do banco
          let enrichedData: Task
          try {
            const desc = JSON.parse(data.description || '{}')
            // Priorizar dados das colunas do banco sobre JSON legacy
            const parent_id = data.parent_id || desc._parent_id || null
            const variation_type = data.variation_type || desc._variation_type || null
            
            enrichedData = {
              ...data,
              parent_id,
              variation_type
            } as Task
          } catch {
            // Se não conseguir fazer o parse, usa apenas dados das colunas do banco
            enrichedData = {
              ...data,
              parent_id: data.parent_id || null,
              variation_type: data.variation_type || null
            } as Task
          }
          
          setTasks((prev) => prev.map((t) => (t.id === id ? enrichedData : t)))
          
          if (retryCount > 0) {

          }
          
          return enrichedData
        }
        
        // UPDATE bem-sucedido mas sem dados retornados (possível problema de RLS)

        // Tentar buscar a task atualizada com SELECT separado
        // IMPORTANTE: Incluir owner, tag e comments explicitamente
        const { data: fetchedDataRaw, error: fetchError } = await supabase
          .from("tasks")
          .select(`
            *,
            owner,
            tag,
            comments:task_comments(
              id,
              content,
              created_at,
              user:profiles!task_comments_user_id_fkey(
                id,
                email,
                name,
                avatar_url
              )
            )
          `)
          .eq("id", id)
        
        // Tratar resultado como array ou objeto único
        let fetchedData = null
        if (fetchedDataRaw) {
          if (Array.isArray(fetchedDataRaw)) {
            fetchedData = fetchedDataRaw.length > 0 ? fetchedDataRaw[0] : null
          } else {
            fetchedData = fetchedDataRaw
          }
        }

        if (fetchedData && !fetchError) {
          // VERIFICAÇÃO CRÍTICA: Garantir que fetchedData tem dados válidos
          if (!fetchedData.id) {

            // Tentar manter a task original com o patch aplicado
            const localTask = tasks.find(t => t.id === id)
            if (localTask) {
              const patchedTask = { ...localTask, ...safePatch } as Task

              setTasks((prev) => prev.map((t) => (t.id === id ? patchedTask : t)))
              return patchedTask
            }
            return null
          }
          
          // Enriquecer dados como antes
          let enrichedData: Task
          try {
            const desc = JSON.parse(fetchedData.description || '{}')
            const parent_id = fetchedData.parent_id || desc._parent_id || null
            const variation_type = fetchedData.variation_type || desc._variation_type || null
            
            enrichedData = {
              ...fetchedData,
              parent_id,
              variation_type
            } as Task
          } catch {
            enrichedData = {
              ...fetchedData,
              parent_id: fetchedData.parent_id || null,
              variation_type: fetchedData.variation_type || null
            } as Task
          }
          
          setTasks((prev) => prev.map((t) => (t.id === id ? enrichedData : t)))

          return enrichedData
        }
        
        // Se ainda não conseguiu, usar os dados do patch aplicado localmente

        const localTask = tasks.find(t => t.id === id)
        if (localTask) {
          // IMPORTANTE: Garantir que owner e tag sejam preservados
          const updatedTask = { 
            ...localTask, 
            ...safePatch,
            owner: localTask.owner,  // Sempre preservar owner original
            tag: localTask.tag        // Sempre preservar tag original
          } as Task

          setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))
          return updatedTask
        }

        return null
        
      } catch (err: any) {

        // Se é um erro de rede, tentar novamente
        if (err.message?.includes('network') || err.message?.includes('fetch') || 
            err.message?.includes('Failed to fetch') || err.name === 'NetworkError') {
          retryCount++
          if (retryCount <= maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000) // Exponential backoff, max 5s

            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        // Reverter otimistic update se falhou definitivamente
        if (originalTask) {
          setTasks((prev) => prev.map((t) => (t.id === id ? originalTask : t)))
        }
        
        retryCount++
        if (retryCount > maxRetries) {
          break
        }
      }
    }

    return null
  }

  async function toggleStatus(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const next: Status = task.status === "done" ? "pending" : "done"
    await updateTask(id, { status: next })
  }

  async function addTask(init?: Partial<Task>): Promise<Task | null> {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    try {
      if (!userId) {
        toast({ title: "Sessão não encontrada", description: "Entre para criar tarefas." })
        return null
      }
      const supabase = await getSupabaseClient()
      const today = new Date().toISOString().slice(0, 10)

      const payload: any = {
        user_id: userId,
        title: init?.title ?? "Nova tarefa",
        description: init?.description ?? "Descrição breve da tarefa",
        tag: init?.tag ?? null,
        owner: init?.owner ?? "Você",
        due_date: init?.due_date ?? null,
        status: (init?.status as Status) ?? "pending",
        priority: (init?.priority as Priority) ?? null,
        assignee_id: init?.assignee_id ?? null,
        kanban_column: init?.kanban_column ?? null,
      }

      if (!supportsAssignee.current) {
        delete payload.assignee_id
      }

      // Create optimistic task for immediate UI feedback
      const optimisticTask: Task = {
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...payload
      } as Task
      
      // Add optimistic task to UI immediately
      setTasks((prev) => [optimisticTask, ...prev])

      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload)
      
      if (insertError) {

        // Remove optimistic task on error
        setTasks((prev) => prev.filter(task => task.id !== tempId))
        toast({
          title: "Erro ao criar tarefa",
          description: insertError.message || "Falha inesperada",
          variant: "destructive",
        })
        return null
      }
      
      // INSERT funcionou, buscar a task criada
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .eq("title", payload.title)
        .order("created_at", { ascending: false })
        .limit(1)
      
      if (error) {

        // Se o erro é relacionado à RLS, tentar novamente
        if (error.message?.includes('policy') || error.code === 'PGRST301') {

          const fallbackPayload = { ...payload }
          
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("tasks")
            .insert(fallbackPayload)
            .select("*")
          
          if (fallbackError) {

            // Remove optimistic task on fallback error
            setTasks((prev) => prev.filter(task => task.id !== tempId))
            toast({
              title: "Erro ao criar tarefa",
              description: fallbackError.message || "Falha inesperada",
              variant: "destructive",
            })
            return null
          }
          
          const created = Array.isArray(fallbackData) ? fallbackData[0] as Task : fallbackData as Task
          if (!created) {

            throw new Error("Nenhum dado retornado do banco (fallback)")
          }

          // Replace optimistic task with real fallback task
          setTasks((prev) => prev.map(task => task.id === tempId ? created : task))
          
          if (created && Object.prototype.hasOwnProperty.call(created, "assignee_id")) {
            supportsAssignee.current = true
          }
          
          // Se a tarefa foi criada/movida para "Em Progresso", iniciar timer automaticamente
          if (created && created.kanban_column === 'in-progress') {
            Promise.resolve().then(async () => {
              const { startTimerForTask } = await import('@/lib/timer-utils')
              const result = await startTimerForTask(created.id)
              if (result.success) {
                console.log(`Timer iniciado automaticamente para tarefa: ${created.title}`)
              } else {
                console.warn(`Não foi possível iniciar timer para tarefa ${created.title}: ${result.error}`)
              }
            }).catch(console.error)
          }
          
          return created
        }
        
        // Remove optimistic task on error
        setTasks((prev) => prev.filter(task => task.id !== tempId))
        toast({
          title: "Erro ao criar tarefa",
          description: error.message || "Falha inesperada",
          variant: "destructive",
        })
        return null
      }
      
      const created = Array.isArray(data) ? data[0] as Task : data as Task
      
      if (!created) {

        throw new Error("Nenhum dado retornado do banco")
      }
      
      // Replace optimistic task with real task from database
      setTasks((prev) => prev.map(task => task.id === tempId ? created : task))

      // Se a tabela passou a ter assignee_id depois do primeiro load, detecta via linha criada
      if (created && Object.prototype.hasOwnProperty.call(created, "assignee_id")) {
        supportsAssignee.current = true
      }

      // Se a tarefa foi criada/movida para "Em Progresso", iniciar timer automaticamente
      if (created && created.kanban_column === 'in-progress') {
        Promise.resolve().then(async () => {
          const { startTimerForTask } = await import('@/lib/timer-utils')
          const result = await startTimerForTask(created.id)
          if (result.success) {
            console.log(`Timer iniciado automaticamente para tarefa: ${created.title}`)
          } else {
            console.warn(`Não foi possível iniciar timer para tarefa ${created.title}: ${result.error}`)
          }
        }).catch(console.error)
      }

      return created
    } catch (err: any) {

      // Remove optimistic task on unexpected error
      setTasks((prev) => prev.filter(task => task.id !== tempId))
      toast({
        title: "Erro ao criar tarefa",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  async function addExamples() {
    try {
      if (!userId) return
      const supabase = await getSupabaseClient()
      const today = new Date().toISOString().slice(0, 10)
      const rowsBase: any[] = [
        {
          user_id: userId,
          title: "Configurar campanha Google Ads",
          description: "Criar nova campanha para cliente premium",
          tag: "gestor",
          owner: "Você",
          due_date: today,
          status: "pending",
          priority: "high",
          assignee_id: userId,
          },
        {
          user_id: userId,
          title: "Revisar roteiro do vídeo",
          description: "Ajustar CTAs e intro",
          tag: "copy",
          owner: "Você",
          due_date: today,
          status: "pending",
          priority: "med",
          assignee_id: null,
          },
      ]

      const rows = supportsAssignee.current
        ? rowsBase
        : rowsBase.map((r) => {
            const { assignee_id, ...rest } = r
            return rest
          })

      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(rows)
      
      if (insertError) {

        return
      }
      
      // INSERT funcionou, buscar as tasks criadas
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .gte("created_at", new Date(Date.now() - 5000).toISOString())
        .order("created_at", { ascending: false })
        .limit(rows.length)
      
      if (error || !data) {

        return
      }
      
      setTasks((prev) => [...(data as Task[]), ...prev])

      // Detecta coluna após retorno
      if ((data as any[])?.some((r) => Object.prototype.hasOwnProperty.call(r, "assignee_id"))) {
        supportsAssignee.current = true
      }
    } catch (err) {

    }
  }

  async function deleteTask(id: string) {
    try {
      const supabase = await getSupabaseClient()
      // Otimista
      const prev = tasks
      setTasks((curr) => curr.filter((t) => t.id !== id))
      const { error } = await supabase.from("tasks").delete().eq("id", id)
      if (error) {

        setTasks(prev) // reverte
      }
    } catch (err) {

    }
  }

  async function createVariation(parentTaskId: string, variationType: 'hook' | 'body' | 'clickbait' | 'edicao'): Promise<Task | null> {

    try {
      if (!userId) {

        toast({ title: "Sessão não encontrada", description: "Entre para criar variações." })
        return null
      }

      // Encontrar a task pai
      const parentTask = tasks.find(t => t.id === parentTaskId)
      if (!parentTask) {

        toast({ title: "Erro", description: "Criativo principal não encontrado." })
        return null
      }

      // Obter próximo número para este tipo de variação (funções já importadas)

      const nextNumber = getNextVariationNumber(tasks, parentTask, variationType)

      // Criar dados da variação

      const variationData = createVariationData(parentTask, variationType, tasks, nextNumber)

      // Gerar título da variação
      const variationTitle = generateVariationTitle(parentTask, variationType, variationData)

      // Criar data para o dia seguinte no fuso horário do Brasil
      const now = new Date()
      const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
      const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]

      // Por enquanto, vamos armazenar os dados de variação no description como JSON
      // incluindo informações sobre a relação pai-filho
      const variationMetadata = {
        ...variationData,
        _parent_id: parentTaskId,
        _variation_type: variationType,
        _is_variation: true
      }

      // Criar payload da variação (incluindo parent_id e variation_type)
      const payload: any = {
        user_id: userId,
        title: variationTitle,
        description: JSON.stringify(variationMetadata),
        tag: parentTask.tag,
        owner: parentTask.owner,
        due_date: parentTask.due_date || tomorrowISO,
        status: "pending" as Status,
        priority: parentTask.priority,
        assignee_id: parentTask.assignee_id,
        parent_id: parentTask.id,
        variation_type: variationType
      }

      if (!supportsAssignee.current) {
        delete payload.assignee_id
      }

      const supabase = await getSupabaseClient()
      
      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload)
      
      if (insertError) {

        toast({
          title: "Erro ao criar variação",
          description: insertError.message || "Falha inesperada",
          variant: "destructive",
        })
        return null
      }
      
      // INSERT funcionou, buscar a variação criada
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .eq("title", variationTitle)
        .order("created_at", { ascending: false })
        .limit(1)
      
      const created = Array.isArray(data) ? data[0] as Task : data as Task
      
      if (!created) {

        toast({
          title: "Erro ao criar variação",
          description: "Variação criada mas não foi possível recuperá-la",
          variant: "destructive",
        })
        return null
      }
      
      // Duplicar comentários da task pai (async, não bloqueia a UI)
      setTimeout(async () => {
        try {
          const { data: sess } = await supabase.auth.getSession()
          const jwt = sess.session?.access_token
          if (jwt) {
            const commentsResponse = await fetch(`/api/tasks/${parentTaskId}/comments`, {
              headers: { Authorization: `Bearer ${jwt}` },
            })
            
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json()
              const comments = commentsData.comments || []
              
              // Duplicar apenas comentários com conteúdo relevante
              const relevantComments = comments.filter(c => c.content?.trim() || c.image_url)
              
              for (const comment of relevantComments) {
                await fetch(`/api/tasks/${created.id}/comments`, {
                  method: 'POST',
                  headers: { 
                    Authorization: `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    content: comment.content,
                    image_url: comment.image_url
                  })
                })
              }
            }
          }
        } catch (commentError) {

        }
      }, 100) // Execute após 100ms para não bloquear a UI

      // Duplicar arquivos anexados da task pai (async, não bloqueia a UI)
      setTimeout(async () => {
        try {
          const { data: parentFiles, error: filesError } = await supabase
            .from("task_files")
            .select("*")
            .eq("task_id", parentTaskId)
            .limit(10) // Limitar para evitar duplicar muitos arquivos
          
          if (!filesError && parentFiles && parentFiles.length > 0) {
            // Criar registros de arquivos para a nova variação
            const newFileRecords = parentFiles.map(file => ({
              task_id: created.id,
              file_name: file.file_name,
              content_type: file.content_type,
              file_size: file.file_size,
              path: file.path, // O mesmo path do arquivo original (referência compartilhada no storage)
              file_category: file.file_category,
              uploaded_by: userId // O usuário atual como uploader da cópia
            }))
            
            await supabase
              .from("task_files")
              .insert(newFileRecords)
          }
        } catch (fileError) {

        }
      }, 200) // Execute após 200ms para não bloquear a UI
      
      // Adicionar os campos simulados localmente
      const enrichedTask = {
        ...created,
        parent_id: parentTaskId,
        variation_type: variationType
      }
      
      // REATIVAR TAREFA PAI SE ESTIVER CONCLUÍDA

      await reactivateParentTaskIfCompleted(parentTask)

      // ATUALIZAR UPDATED_AT DO PAI PARA MOVER PARA O TOPO

      await updateTask(parentTask.id, {
        updated_at: new Date().toISOString()
      })

      // RESETAR ESTADO "PRONTO" E ADICIONAR NOTIFICAÇÃO

      await resetParentReadyState(parentTask, variationType)

      setTasks((prev) => [enrichedTask as Task, ...prev])

      toast({
        title: "Variação criada",
        description: `Variação de ${variationType} criada com sucesso!`
      })

      return enrichedTask as Task
    } catch (err: any) {

      toast({
        title: "Erro ao criar variação",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  // Função auxiliar para reativar tarefa pai se estiver concluída
  async function reactivateParentTaskIfCompleted(parentTask: Task): Promise<void> {
    try {
      // Verificar se a tarefa pai está concluída
      if (parentTask.status !== "done") {
        return // Não precisa reativar
      }

      // Adicionar tag "VARIAÇÃO" se não existir
      const currentTitle = parentTask.title || ""
      const hasVariacaoTag = currentTitle.includes("[VARIAÇÃO]")
      const newTitle = hasVariacaoTag ? currentTitle : `${currentTitle} [VARIAÇÃO]`

      // Criar data para hoje (reativar para hoje)
      const now = new Date()
      const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
      const todayISO = brazilNow.toISOString().split('T')[0]

      // Payload para atualizar a tarefa
      const updatePayload: any = {
        status: "pending" as Status,
        title: newTitle,
        due_date: todayISO,
        updated_at: new Date().toISOString()
      }

      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from("tasks")
        .update(updatePayload)
        .eq("id", parentTask.id)

      if (error) {

        return
      }

      // Atualizar no estado local
      setTasks((prev) => {
        const updated = prev.map(task => 
          task.id === parentTask.id 
            ? { ...task, status: "pending" as Status, title: newTitle, due_date: todayISO }
            : task
        )
        
        // Mover a tarefa reativada para o topo
        const reactivatedTask = updated.find(t => t.id === parentTask.id)
        const otherTasks = updated.filter(t => t.id !== parentTask.id)
        
        return reactivatedTask ? [reactivatedTask, ...otherTasks] : updated
      })

    } catch (err: any) {

    }
  }

  // Função auxiliar para resetar estado "pronto" quando uma variação é criada
  async function resetParentReadyState(parentTask: Task, variationType: VariationType): Promise<void> {
    try {
      const currentData = JSON.parse(parentTask.description || '{}')
      
      // Se o pai não está pronto, não faz nada
      if (!currentData.is_ready) return

      // Apenas reset is_ready (sem mais badges de solicitação)
      const updatedData = {
        ...currentData,
        is_ready: false // Reset estado pronto
      }
      
      const result = await updateTask(parentTask.id, {
        description: JSON.stringify(updatedData)
      })
      
      if (!result) {

        return
      }

    } catch (err: any) {

    }
  }

  // Função auxiliar para encontrar variações de um criativo (otimizada)
  async function findVariations(parentTaskId: string): Promise<Task[]> {
    
    // Cache simples para evitar buscas repetidas
    const cacheKey = `variations_${parentTaskId}`
    
    // Buscar variações tanto por parent_id enriquecido quanto por JSON no description
    let variations = tasks.filter(t => t.parent_id === parentTaskId)
    
    // Buscar também por JSON no description de forma otimizada
    for (const task of tasks) {
      // Pular se já encontrou por parent_id
      if (variations.find(v => v.id === task.id)) continue
      
      try {
        // Verificação rápida antes de fazer parse completo
        if (task.description?.includes(`"_parent_id":"${parentTaskId}"`) || task.parent_id === parentTaskId) {
          const desc = JSON.parse(task.description)
          const parent_id = task.parent_id || desc._parent_id
          const variation_type = task.variation_type || desc._variation_type
          
          if (parent_id === parentTaskId) {
            variations.push({
              ...task,
              parent_id,
              variation_type
            })
          }
        }
      } catch {
        // Continua sem fazer nada se não conseguir parsear
      }
    }
    
    // Apenas fazer fallback no Supabase se não encontrou variações localmente
    // e a busca local parece incompleta (ex: task pai existe mas sem variações)
    if (variations.length === 0) {
      const parentTask = tasks.find(t => t.id === parentTaskId)
      if (parentTask) {
        // Busca rápida no Supabase apenas se necessário
        try {
          const supabase = await getSupabaseClient()
          const { data: supabaseVariations, error: variationsError } = await supabase
            .from("tasks")
            .select("id, title, description, status, created_at")
            // .eq("user_id", userId) - Removido para modo colaborativo
            .like("description", `%"_parent_id":"${parentTaskId}"%`)
            .limit(20)
          
          if (!variationsError && supabaseVariations && supabaseVariations.length > 0) {
            for (const task of supabaseVariations) {
              try {
                const desc = JSON.parse(task.description || '{}')
                const parent_id = task.parent_id || desc._parent_id
                const variation_type = task.variation_type || desc._variation_type
                
                if (parent_id === parentTaskId) {
                  variations.push({
                    ...task,
                    parent_id,
                    variation_type
                  } as Task)
                }
              } catch {
                // Se não conseguir parsear JSON, verificar se é variação pelas colunas do banco
                if (task.parent_id === parentTaskId) {
                  variations.push({
                    ...task,
                    parent_id: task.parent_id,
                    variation_type: task.variation_type
                  } as Task)
                }
              }
            }
          }
        } catch (error) {

        }
      }
    }
    
    return variations
  }

  // Função auxiliar para duplicar apenas o criativo principal
  async function duplicateMainCreative(originalTask: Task): Promise<Task | null> {
    try {
      // Criar data para o dia seguinte no fuso horário do Brasil
      const now = new Date()
      const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
      const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]

      const originalData = JSON.parse(originalTask.description || '{}')
      
      // Obter próximo número para este produto (função já importada)
      const nextNumber = getNextCreativeNumber(tasks, originalTask.owner || '')
      
      // Atualizar os dados com o novo número
      const duplicatedData = {
        ...originalData,
        numero_criativo: nextNumber
      }
      
      // Buscar nomes completos dos membros
      let copyFullName = ''
      let editorFullName = ''
      
      if (duplicatedData.iniciais_copy) {
        const copyMember = members.find(m => {
          const initials = m.name?.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 
                         m.email?.substring(0, 2).toUpperCase() || 'XX'
          return initials === duplicatedData.iniciais_copy
        })
        if (copyMember) {
          copyFullName = copyMember.name || copyMember.email || ''
        }
      }
      
      if (originalTask.assignee_id) {
        const editorMember = members.find(m => m.id === originalTask.assignee_id)
        if (editorMember) {
          editorFullName = editorMember.name || editorMember.email || ''
        }
      } else if (duplicatedData.iniciais_editor) {
        const editorMember = members.find(m => {
          const initials = m.name?.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 
                         m.email?.substring(0, 2).toUpperCase() || 'XX'
          return initials === duplicatedData.iniciais_editor
        })
        if (editorMember) {
          editorFullName = editorMember.name || editorMember.email || ''
        }
      }
      
      // Gerar novo título
      const newTitle = generateCreativeNomenclature(
        originalTask.owner || '',
        nextNumber,
        duplicatedData.numero_clickbait || 0,
        duplicatedData.numero_hook || 1,
        duplicatedData.numero_body || 1,
        duplicatedData.numero_edicao || 0,
        duplicatedData.iniciais_copy || '',
        duplicatedData.iniciais_editor || '',
        duplicatedData.fonte_trafego || '',
        copyFullName,
        editorFullName,
        duplicatedData.proporcao,
        duplicatedData.formato,
        duplicatedData.numero_avatar || "-",
        duplicatedData.idioma
      )

      // Criar payload da duplicação
      const payload: any = {
        user_id: userId,
        title: newTitle,
        description: JSON.stringify(duplicatedData),
        tag: originalTask.tag,
        owner: originalTask.owner,
        due_date: tomorrowISO,
        status: "pending" as Status,
        priority: originalTask.priority,
        assignee_id: originalTask.assignee_id,
      }

      if (!supportsAssignee.current) {
        delete payload.assignee_id
      }

      const supabase = await getSupabaseClient()
      
      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload)
      
      if (insertError) {

        toast({
          title: "Erro ao duplicar criativo",
          description: insertError.message || "Falha inesperada",
          variant: "destructive",
        })
        return null
      }
      
      // INSERT funcionou, buscar a task criada
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .eq("title", newTitle)
        .order("created_at", { ascending: false })
        .limit(1)
      
      const created = Array.isArray(data) ? data[0] as Task : data as Task
      
      if (!created) {

        toast({
          title: "Erro ao duplicar criativo",
          description: "Criativo criado mas não foi possível recuperá-lo",
          variant: "destructive",
        })
        return null
      }
      
      // Duplicar comentários da task original
      try {
        const { data: sess } = await supabase.auth.getSession()
        const jwt = sess.session?.access_token
        if (jwt) {
          const commentsResponse = await fetch(`/api/tasks/${originalTask.id}/comments`, {
            headers: { Authorization: `Bearer ${jwt}` },
          })
          
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json()
            const comments = commentsData.comments || []
            
            for (const comment of comments) {
              await fetch(`/api/tasks/${created.id}/comments`, {
                method: 'POST',
                headers: { 
                  Authorization: `Bearer ${jwt}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  content: comment.content,
                  image_url: comment.image_url
                })
              })
            }
          }
        }
      } catch (commentError) {

      }

      // Duplicar arquivos anexados da task original
      try {
        const { data: originalFiles, error: filesError } = await supabase
          .from("task_files")
          .select("*")
          .eq("task_id", originalTask.id)
        
        if (!filesError && originalFiles && originalFiles.length > 0) {
          const newFileRecords = originalFiles.map(file => ({
            task_id: created.id,
            file_name: file.file_name,
            content_type: file.content_type,
            file_size: file.file_size,
            path: file.path,
            file_category: file.file_category,
            uploaded_by: userId
          }))
          
          await supabase
            .from("task_files")
            .insert(newFileRecords)
        }
      } catch (fileError) {

      }
      
      // Adicionar os campos simulados localmente
      const enrichedTask = {
        ...created,
        parent_id: null,
        variation_type: null
      }
      
      setTasks((prev) => [enrichedTask as Task, ...prev])
      if (process.env.NODE_ENV === 'development') {

      }

      return enrichedTask as Task
    } catch (error) {

      toast({
        title: "Erro ao duplicar criativo",
        description: "Falha ao processar dados do criativo",
        variant: "destructive",
      })
      return null
    }
  }

  async function duplicateTask(taskId: string): Promise<Task | null> {
    if (process.env.NODE_ENV === 'development') {

    }
    
    try {
      if (!userId) {
        toast({ title: "Sessão não encontrada", description: "Entre para duplicar tarefas." })
        return null
      }

      // Encontrar a task original
      const originalTask = tasks.find(t => t.id === taskId)
      if (!originalTask) {
        toast({ title: "Erro", description: "Criativo não encontrado." })
        return null
      }

      // Se for uma variação, duplicar como cópia exata
      if (originalTask.parent_id && originalTask.variation_type) {
        return await duplicateVariationExact(originalTask)
      }

      // Se for um criativo principal, fazer duplicação em duas fases
      toast({
        title: "Duplicando criativo...",
        description: "Criando criativo principal e suas variações..."
      })

      // FASE 1: Duplicar criativo principal
      const newMainCreative = await duplicateMainCreative(originalTask)
      if (!newMainCreative) {
        return null
      }

      // FASE 2: Duplicar TODAS as variações exatamente iguais, preservando ordem
      const variations = await findVariations(originalTask.id)
      
      // Debug: verificar tipos das variações encontradas

      variations.forEach((v, idx) => {
        const vData = JSON.parse(v.description || '{}')

      })
      
      // Ordenar variações pela data de criação original para preservar ordem
      variations.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      let duplicatedCount = 0
      const newVariations: Task[] = []
      
      const supabase = await getSupabaseClient()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]
      
      // Criar timestamp base para manter ordem sequencial
      let baseTimestamp: Date
      try {
        baseTimestamp = new Date(newMainCreative.created_at)
        if (isNaN(baseTimestamp.getTime())) {

          baseTimestamp = new Date()
        }
      } catch (error) {

        baseTimestamp = new Date()
      }
      
      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i]
        try {
          // Copiar descrição da variação original e apenas trocar parent_id e numero_criativo
          const variationData = JSON.parse(variation.description || '{}')
          
          // Usar o variation_type do banco - mais confiável que o JSON
          const correctVariationType = variation.variation_type || 'hook'
          
          const newVariationData = {
            ...variationData, // Manter TUDO igual
            _parent_id: newMainCreative.id, // Apenas trocar o pai
            numero_criativo: newMainCreative.id, // Usar ID do novo criativo
            _variation_type: correctVariationType, // Garantir que o tipo seja preservado
            _is_variation: true // Garantir que é marcada como variação
          }

          // Usar dados do novo criativo principal para gerar título
          const newMainData = JSON.parse(newMainCreative.description || '{}')
          
          // Buscar nomes completos para a variação
          let varCopyFullName = ''
          let varEditorFullName = ''
          
          if (newMainData.iniciais_copy) {
            const copyMember = members.find(m => {
              const initials = m.name?.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 
                             m.email?.substring(0, 2).toUpperCase() || 'XX'
              return initials === newMainData.iniciais_copy
            })
            if (copyMember) {
              varCopyFullName = copyMember.name || copyMember.email || ''
            }
          }
          
          if (newMainCreative.assignee_id) {
            const editorMember = members.find(m => m.id === newMainCreative.assignee_id)
            if (editorMember) {
              varEditorFullName = editorMember.name || editorMember.email || ''
            }
          } else if (newMainData.iniciais_editor) {
            const editorMember = members.find(m => {
              const initials = m.name?.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 
                             m.email?.substring(0, 2).toUpperCase() || 'XX'
              return initials === newMainData.iniciais_editor
            })
            if (editorMember) {
              varEditorFullName = editorMember.name || editorMember.email || ''
            }
          }
          
          const variationTitle = generateCreativeNomenclature(
            newMainCreative.owner || '',
            newMainData.numero_criativo,
            newVariationData.numero_clickbait || 0,
            newVariationData.numero_hook || 1,
            newVariationData.numero_body || 1,
            newVariationData.numero_edicao || 0,
            newMainData.iniciais_copy || '',
            newMainData.iniciais_editor || '',
            newMainData.fonte_trafego || '',
            varCopyFullName,
            varEditorFullName,
            newMainData.proporcao,
            newMainData.formato,
            newVariationData.numero_avatar || "-",
            newMainData.idioma
          )

          // Criar timestamp sequencial para preservar ordem (alguns segundos após o pai)
          let variationTimestamp: Date
          try {
            variationTimestamp = new Date(baseTimestamp.getTime() + (i + 1) * 1000)
            if (isNaN(variationTimestamp.getTime())) {

              variationTimestamp = new Date(Date.now() + (i + 1) * 1000)
            }
          } catch (error) {

            variationTimestamp = new Date(Date.now() + (i + 1) * 1000)
          }

          // Criar variação como cópia exata com timestamp preservado
          // Fazer INSERT sem SELECT (mais confiável)
          const { error: insertError } = await supabase
            .from("tasks")
            .insert({
              user_id: userId,
              title: variationTitle,
              description: JSON.stringify(newVariationData),
              tag: variation.tag,
              owner: variation.owner,
              due_date: tomorrowISO,
              status: "pending" as Status,
              priority: variation.priority,
                    created_at: variationTimestamp.toISOString(), // Preservar ordem
              updated_at: variationTimestamp.toISOString()
            })

          let newVariationResult = null
          let varError = null

          if (!insertError) {
            // INSERT funcionou, buscar a variação criada
            const { data: dataRaw, error } = await supabase
              .from("tasks")
              .select("*")
              // .eq("user_id", userId) - Removido para modo colaborativo
              .eq("title", variationTitle)
              .order("created_at", { ascending: false })
              .limit(1)
            
            // Tratar resultado como array ou objeto único
            let data = null
            if (dataRaw) {
              if (Array.isArray(dataRaw)) {
                data = dataRaw.length > 0 ? dataRaw[0] : null
              } else {
                data = dataRaw
              }
            }
            
            newVariationResult = data
            varError = error
          } else {
            varError = insertError
          }

          if (!varError && newVariationResult) {
            duplicatedCount++
            // Enriquecer com dados de variação para o estado local
            const enrichedVariation = {
              ...newVariationResult,
              parent_id: newMainCreative.id,
              variation_type: correctVariationType // Usar o tipo correto determinado
            } as Task
            newVariations.push(enrichedVariation)

          } else {

          }
        } catch (varErr) {

        }
      }
      
      // Atualizar estado local imediatamente para mostrar setas
      if (newVariations.length > 0) {
        setTasks(prev => [...prev, ...newVariations])
      }
      
      if (variations.length > 0) {
        
        toast({
          title: "Criativo duplicado!",
          description: `Criativo duplicado com sucesso! ${duplicatedCount} de ${variations.length} variação(ões) duplicadas.`
        })
      } else {
        toast({
          title: "Criativo duplicado!",
          description: "Criativo duplicado com sucesso!"
        })
      }

      return newMainCreative
    } catch (err: any) {

      toast({
        title: "Erro ao duplicar criativo",
        description: err.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  // Função para criar reedição (cria nova task filha, igual às outras variações)
  async function createReedition(taskId: string): Promise<Task | null> {

    try {
      // Encontrar a task original
      const originalTask = tasks.find(t => t.id === taskId)
      if (!originalTask) {

        toast({ title: "Erro", description: "Criativo não encontrado." })
        return null
      }

      // Verificar se é uma variação (tem parent_id)
      const originalData = JSON.parse(originalTask.description || '{}')
      const isVariation = originalData._parent_id && originalData._variation_type

      if (isVariation) {
        // É uma variação - duplicar mantendo tags originais + reedição

        // Usar função segura para evitar numeração duplicada
        const newReeditionNumber = getNextSafeReeditionNumber(originalTask)
        
        // Manter todos os dados originais, apenas incrementar R
        const reeditionData = {
          ...originalData,
          numero_edicao: newReeditionNumber
          // Dados de relação (_parent_id e _variation_type) mantidos do original
        }
        
        // Para reedições de variações, precisamos buscar o número do criativo principal (pai)
        const parentTask = tasks.find(t => t.id === originalData._parent_id)
        const parentData = parentTask ? JSON.parse(parentTask.description || '{}') : {}
        const creativeNumber = parentData.numero_criativo || 1
        
        // Buscar nomes completos para a reedição
        let reedCopyFullName = ''
        let reedEditorFullName = ''
        
        if (originalData.iniciais_copy) {
          const copyMember = members.find(m => {
            const initials = m.name?.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 
                           m.email?.substring(0, 2).toUpperCase() || 'XX'
            return initials === originalData.iniciais_copy
          })
          if (copyMember) {
            reedCopyFullName = copyMember.name || copyMember.email || ''
          }
        }
        
        if (originalTask.assignee_id) {
          const editorMember = members.find(m => m.id === originalTask.assignee_id)
          if (editorMember) {
            reedEditorFullName = editorMember.name || editorMember.email || ''
          }
        } else if (originalData.iniciais_editor) {
          const editorMember = members.find(m => {
            const initials = m.name?.trim().split(' ').map((word: string) => word.charAt(0).toUpperCase()).slice(0, 2).join('') || 
                           m.email?.substring(0, 2).toUpperCase() || 'XX'
            return initials === originalData.iniciais_editor
          })
          if (editorMember) {
            reedEditorFullName = editorMember.name || editorMember.email || ''
          }
        }
        
        // Gerar novo título com R incrementado usando o número do criativo principal
        const newTitle = generateCreativeNomenclature(
          originalTask.owner || '',
          creativeNumber,
          originalData.numero_clickbait || 0,
          originalData.numero_hook || 1,
          originalData.numero_body || 1,
          newReeditionNumber,
          originalData.iniciais_copy || '',
          originalData.iniciais_editor || '',
          originalData.fonte_trafego || '',
          reedCopyFullName,
          reedEditorFullName,
          originalData.proporcao,
          originalData.formato,
          originalData.numero_avatar || "-",
          originalData.idioma
        )

        // Criar data para o dia seguinte
        const now = new Date()
        const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
        const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
        const tomorrowISO = tomorrow.toISOString().split('T')[0]

        const newTaskData = {
          tag: originalTask.tag,
          owner: originalTask.owner,
          title: newTitle,
          description: JSON.stringify(reeditionData),
          due_date: tomorrowISO,
          priority: originalTask.priority,
          status: "pending" as Status,
          user_id: userId,
          assignee_id: originalTask.assignee_id,
            // A reedição de variação mantém o mesmo parent_id da variação original
          parent_id: originalData._parent_id,
          // Marcar como reedição no campo variation_type
          variation_type: 'edicao'
        }

        if (!supportsAssignee.current) {
          delete newTaskData.assignee_id
        }

        let createdTask
        let error

        try {

          const supabase = await getSupabaseClient()

          // Fazer INSERT sem SELECT (mais confiável)
          const { error: insertError } = await supabase
            .from("tasks")
            .insert(newTaskData)
          
          if (insertError) {
            error = insertError
            createdTask = null
          } else {
            // INSERT funcionou, buscar a task criada
            const { data: selectData, error: selectError } = await supabase
              .from("tasks")
              .select("*")
              // .eq("user_id", userId) - Removido para modo colaborativo
              .eq("title", newTitle)
              .order("created_at", { ascending: false })
              .limit(1)
            
            createdTask = Array.isArray(selectData) ? selectData[0] : selectData
            error = selectError
          }
        } catch (networkError) {

          toast({
            title: "Erro de conectividade",
            description: "Problema de conexão. Tente novamente ou verifique sua internet.",
            variant: "destructive",
          })
          return null
        }

        if (error || !createdTask) {

          toast({
            title: "Erro ao criar reedição",
            description: error?.message || "Não foi possível recuperar a reedição criada",
            variant: "destructive",
          })
          return null
        }

        // Os campos parent_id e variation_type agora vêm do banco
        const enrichedTask = createdTask

        setTasks((prev) => [enrichedTask as Task, ...prev])
        
        toast({
          title: "Reedição criada!",
          description: `Reedição da variação ${originalData._variation_type.toUpperCase()} criada com R${newReeditionNumber}`
        })

        return enrichedTask as Task
      } else {
        // É um criativo principal - usar lógica normal de variação
        return await createVariation(taskId, 'edicao')
      }
    } catch (err: any) {

      toast({
        title: "Erro ao criar reedição",
        description: err.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  // Função para criar variação usando um criativo principal já criado (usado na duplicação)
  async function createVariationDirect(parentTask: Task, variationType: 'hook' | 'body' | 'clickbait' | 'edicao'): Promise<Task | null> {
    try {
      if (!userId) {

        toast({ title: "Sessão não encontrada", description: "Entre para criar variações." })
        return null
      }

      // Funções já importadas estaticamente
      
      // Obter próximo número para este tipo de variação
      const nextNumber = getNextVariationNumber(tasks, parentTask, variationType)
      
      // Criar dados da variação
      const variationData = createVariationData(parentTask, variationType, tasks, nextNumber)
      
      // Gerar título da variação
      const variationTitle = generateVariationTitle(parentTask, variationType, variationData)

      // Criar data para o dia seguinte no fuso horário do Brasil
      const now = new Date()
      const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
      const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]

      // Por enquanto, vamos armazenar os dados de variação no description como JSON
      // incluindo informações sobre a relação pai-filho
      const variationMetadata = {
        ...variationData,
        _parent_id: parentTask.id,
        _variation_type: variationType,
        _is_variation: true
      }

      // Criar payload da variação (incluindo parent_id e variation_type)
      const payload: any = {
        user_id: userId,
        title: variationTitle,
        description: JSON.stringify(variationMetadata),
        tag: parentTask.tag,
        owner: parentTask.owner,
        due_date: parentTask.due_date || tomorrowISO,
        status: "pending" as Status,
        priority: parentTask.priority,
        assignee_id: parentTask.assignee_id,
        parent_id: parentTask.id,
        variation_type: variationType
      }

      if (!supportsAssignee.current) {
        delete payload.assignee_id
      }

      const supabase = await getSupabaseClient()
      
      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload)
      
      if (insertError) {

        toast({
          title: "Erro ao criar variação",
          description: insertError.message || "Falha inesperada",
          variant: "destructive",
        })
        return null
      }
      
      // INSERT funcionou, buscar a variação criada
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .eq("title", variationTitle)
        .order("created_at", { ascending: false })
        .limit(1)
      
      const created = Array.isArray(data) ? data[0] as Task : data as Task
      
      if (!created) {

        toast({
          title: "Erro ao criar variação",
          description: "Variação criada mas não foi possível recuperá-la",
          variant: "destructive",
        })
        return null
      }
      
      // Duplicar comentários da task pai
      try {
        const { data: sess } = await supabase.auth.getSession()
        const jwt = sess.session?.access_token
        if (jwt) {
          // Buscar comentários da task pai
          const commentsResponse = await fetch(`/api/tasks/${parentTask.id}/comments`, {
            headers: { Authorization: `Bearer ${jwt}` },
          })
          
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json()
            const comments = commentsData.comments || []
            
            // Duplicar cada comentário para a nova variação
            for (const comment of comments) {
              await fetch(`/api/tasks/${created.id}/comments`, {
                method: 'POST',
                headers: { 
                  Authorization: `Bearer ${jwt}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  content: comment.content,
                  image_url: comment.image_url
                })
              })
            }
          }
        }
      } catch (commentError) {

        // Não falha a criação da variação se os comentários não puderem ser copiados
      }

      // Duplicar arquivos anexados da task pai
      try {
        const { data: parentFiles, error: filesError } = await supabase
          .from("task_files")
          .select("*")
          .eq("task_id", parentTask.id)
        
        if (!filesError && parentFiles && parentFiles.length > 0) {
          // Criar registros de arquivos para a nova variação
          const newFileRecords = parentFiles.map(file => ({
            task_id: created.id,
            file_name: file.file_name,
            content_type: file.content_type,
            file_size: file.file_size,
            path: file.path, // O mesmo path do arquivo original (referência compartilhada no storage)
            file_category: file.file_category,
            uploaded_by: userId // O usuário atual como uploader da cópia
          }))
          
          await supabase
            .from("task_files")
            .insert(newFileRecords)
        }
      } catch (fileError) {

        // Não falha a criação da variação se os arquivos não puderem ser copiados
      }
      
      // Os campos parent_id e variation_type agora vêm do banco
      const enrichedTask = created
      
      // REATIVAR TAREFA PAI SE ESTIVER CONCLUÍDA
      await reactivateParentTaskIfCompleted(parentTask)
      
      // RESETAR ESTADO "PRONTO" E ADICIONAR NOTIFICAÇÃO
      await resetParentReadyState(parentTask, variationType)
      
      setTasks((prev) => [enrichedTask as Task, ...prev])

      toast({
        title: "Variação criada",
        description: `Variação de ${variationType} criada com sucesso!`
      })

      return enrichedTask as Task
    } catch (err: any) {

      toast({
        title: "Erro ao criar variação",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  // Função auxiliar para criar variação com número específico (usada na duplicação)
  // Função para criar variação com dados exatos (para duplicação)
  async function createVariationDirectWithExactData(parentTask: Task, variationType: 'hook' | 'body' | 'clickbait' | 'edicao', originalVariationData: any): Promise<Task | null> {
    try {
      if (!userId) {

        toast({ title: "Sessão não encontrada", description: "Entre para criar variações." })
        return null
      }

      // Usar dados originais da variação, apenas atualizar parent_id e número do criativo
      const parentData = JSON.parse(parentTask.description || '{}')
      
      const exactVariationData = {
        ...originalVariationData,
        // Atualizar apenas dados relacionados ao novo pai
        numero_criativo: parentData.numero_criativo,
        prefixo_oferta: parentData.prefixo_oferta,
        iniciais_copy: parentData.iniciais_copy,
        iniciais_editor: parentData.iniciais_editor,
        fonte_trafego: parentData.fonte_trafego
      }
      
      // Gerar título da variação com os dados exatos
      const variationTitle = generateVariationTitle(parentTask, variationType, exactVariationData)

      // Criar data para o dia seguinte no fuso horário do Brasil
      const now = new Date()
      const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
      const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]

      // Incluir informações sobre a relação pai-filho
      const variationMetadata = {
        ...exactVariationData,
        _parent_id: parentTask.id,
        _variation_type: variationType,
        _is_variation: true
      }

      // Criar payload da variação
      const payload: any = {
        user_id: userId,
        title: variationTitle,
        description: JSON.stringify(variationMetadata),
        tag: parentTask.tag,
        owner: parentTask.owner,
        due_date: tomorrowISO,
        status: "pending" as Status,
        priority: parentTask.priority,
        assignee_id: parentTask.assignee_id,
      }

      if (!supportsAssignee.current) {
        delete payload.assignee_id
      }

      const supabase = await getSupabaseClient()
      
      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload)

      if (insertError) {

        toast({
          title: "Erro ao criar variação",
          description: insertError.message,
          variant: "destructive",
        })
        return null
      }
      
      // INSERT funcionou, buscar a variação criada
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .eq("title", variationTitle)
        .order("created_at", { ascending: false })
        .limit(1)
      
      const created = Array.isArray(data) ? data[0] as Task : data as Task
      
      if (!created) {

        toast({
          title: "Erro ao criar variação",
          description: "Variação criada mas não foi possível recuperá-la",
          variant: "destructive",
        })
        return null
      }

      return created

    } catch (err: any) {

      toast({
        title: "Erro ao criar variação",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  async function createVariationDirectWithNumber(parentTask: Task, variationType: 'hook' | 'body' | 'clickbait' | 'edicao', variationNumber: number): Promise<Task | null> {
    try {
      if (!userId) {

        toast({ title: "Sessão não encontrada", description: "Entre para criar variações." })
        return null
      }

      // Funções já importadas estaticamente
      
      // Criar dados da variação com número específico
      const variationData = createVariationData(parentTask, variationType, tasks, variationNumber)
      
      // Gerar título da variação
      const variationTitle = generateVariationTitle(parentTask, variationType, variationData)

      // Criar data para o dia seguinte no fuso horário do Brasil
      const now = new Date()
      const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
      const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]

      // Por enquanto, vamos armazenar os dados de variação no description como JSON
      // incluindo informações sobre a relação pai-filho
      const variationMetadata = {
        ...variationData,
        _parent_id: parentTask.id,
        _variation_type: variationType,
        _is_variation: true
      }

      // Criar payload da variação
      const payload: any = {
        user_id: userId,
        title: variationTitle,
        description: JSON.stringify(variationMetadata),
        tag: parentTask.tag,
        owner: parentTask.owner,
        due_date: parentTask.due_date || tomorrowISO,
        status: "pending" as Status,
        priority: parentTask.priority,
        assignee_id: parentTask.assignee_id,
      }

      if (!supportsAssignee.current) {
        delete payload.assignee_id
      }

      const supabase = await getSupabaseClient()
      
      // Fazer INSERT sem SELECT (mais confiável)
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload)
      
      if (insertError) {

        toast({
          title: "Erro ao criar variação",
          description: insertError.message || "Falha inesperada",
          variant: "destructive",
        })
        return null
      }
      
      // INSERT funcionou, buscar a variação criada
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // .eq("user_id", userId) - Removido para modo colaborativo
        .eq("title", variationTitle)
        .order("created_at", { ascending: false })
        .limit(1)
      
      const created = Array.isArray(data) ? data[0] as Task : data as Task
      
      if (!created) {

        toast({
          title: "Erro ao criar variação",
          description: "Variação criada mas não foi possível recuperá-la",
          variant: "destructive",
        })
        return null
      }
      
      // Adicionar dados simulados para compatibilidade
      const enrichedTask = {
        ...created,
        parent_id: parentTask.id,
        variation_type: variationType
      }
      
      // REATIVAR TAREFA PAI SE ESTIVER CONCLUÍDA
      await reactivateParentTaskIfCompleted(parentTask)
      
      // RESETAR ESTADO "PRONTO" E ADICIONAR NOTIFICAÇÃO
      await resetParentReadyState(parentTask, variationType)
      
      setTasks((prev) => [enrichedTask as Task, ...prev])

      return enrichedTask as Task
    } catch (err: any) {

      toast({
        title: "Erro ao criar variação",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
      return null
    }
  }

  async function addComment(taskId: string, content: string): Promise<void> {

    try {
      if (!userId) {

        toast({ title: "Sessão não encontrada", description: "Entre para comentar." })
        return
      }

      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          user_id: userId,
          content: content.trim()
        })
        .select(`
          id,
          content,
          created_at,
          user_id
        `)
        .single()

      if (error) {

        toast({
          title: "Erro ao adicionar comentário",
          description: error.message || "Falha inesperada",
          variant: "destructive",
        })
        return
      }

      // O comentário será automaticamente sincronizado via real-time subscription
      // Não precisamos atualizar manualmente o estado local
      
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso."
      })
    } catch (err: any) {

      toast({
        title: "Erro ao adicionar comentário",
        description: err?.message || "Falha inesperada",
        variant: "destructive",
      })
    }
  }

  // Kanban Column Management Functions
  const getKanbanColumns = useCallback(async (workspaceId: string): Promise<KanbanColumn[]> => {
    try {
      const supabase = await getSupabaseClient()
      
      // Obter o usuário diretamente da sessão atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      
      const currentUserId = user.id
      const { data, error } = await supabase
        .from("kanban_columns")
        .select("*")
        // .eq("user_id", currentUserId) - Removido para modo colaborativo
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true })
      
      if (error) {
        // Check if table doesn't exist (error code 42P01)
        if (error.code === '42P01' || error.message.includes('does not exist')) {

          return []
        }

        return []
      }
      
      return data || []
    } catch (err: any) {
      // Network or other errors - graceful fallback

      return []
    }
  }, [])

  const createKanbanColumn = useCallback(async (workspaceId: string, columnData: { column_id: string; title: string; color: string; position: number }): Promise<KanbanColumn | null> => {
    try {
      const supabase = await getSupabaseClient()
      
      // Obter o usuário diretamente da sessão atual para garantir sincronização
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {

        return null
      }
      
      // Usar o ID do usuário diretamente da sessão
      const currentUserId = user.id

      const { data, error } = await supabase
        .from("kanban_columns")
        .insert({
          user_id: currentUserId, // Usar o ID obtido da sessão atual
          workspace_id: workspaceId,
          column_id: columnData.column_id,
          title: columnData.title,
          color: columnData.color,
          position: columnData.position
        })
        .select()
        .single()
      
      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message.includes('does not exist')) {

          return null
        }
        // Check for RLS policy violation
        if (error.code === '42501') {

          return null
        }

        return null
      }
      
      return data
    } catch (err: any) {

      return null
    }
  }, [])

  const updateKanbanColumn = useCallback(async (workspaceId: string, columnId: string, updates: Partial<Pick<KanbanColumn, 'title' | 'color' | 'position'>>): Promise<KanbanColumn | null> => {
    try {
      const supabase = await getSupabaseClient()
      
      // Obter o usuário diretamente da sessão atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {

        return null
      }
      
      const currentUserId = user.id
      const { data, error } = await supabase
        .from("kanban_columns")
        .update(updates)
        // .eq("user_id", currentUserId) - Removido para modo colaborativo
        .eq("workspace_id", workspaceId)
        .eq("column_id", columnId)
        .select()
        .single()
      
      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message.includes('does not exist')) {

          return null
        }

        return null
      }
      
      return data
    } catch (err: any) {

      return null
    }
  }, [])

  const deleteKanbanColumn = useCallback(async (workspaceId: string, columnId: string): Promise<void> => {
    try {
      const supabase = await getSupabaseClient()
      
      // Obter o usuário diretamente da sessão atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {

        return
      }
      
      const currentUserId = user.id
      const { error } = await supabase
        .from("kanban_columns")
        .delete()
        // .eq("user_id", currentUserId) - Removido para modo colaborativo
        .eq("workspace_id", workspaceId)
        .eq("column_id", columnId)
      
      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message.includes('does not exist')) {

          return
        }

        return
      }

    } catch (err: any) {

    }
  }, [])

  // Delete comment function
  const deleteComment = async (taskId: string, commentId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const currentUserId = session?.user?.id || userId
      
      // Delete via API
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          comment_id: commentId,
          user_id: currentUserId
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      // Update local state
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            comments: t.comments?.filter(c => c.id !== commentId) || []
          }
        }
        return t
      }))
      
      toast({
        title: "Comentário excluído",
        description: "O comentário foi removido com sucesso.",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao excluir comentário",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Cross-department linked tasks function
  const createLinkedTasks = async (params: { targetDepartment: string; targetDepartmentName: string; title: string; dueDate?: string; assigneeIds?: string[]; priority?: string }) => {
    try {
      console.log("🚀 Iniciando createLinkedTasks com params:", params)
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const currentUserId = session?.user?.id || userId
      
      console.log("👤 User ID:", currentUserId)
      if (!currentUserId) {
        throw new Error("Usuário não autenticado")
      }

      // Create both tasks with linked references
      const timestamp = new Date().toISOString()
      
      // Get current user's department - try email mapping first, then profile
      let currentUserDepartment = 'particular' // Default fallback
      
      // Get user's email
      const userEmail = session?.user?.email
      console.log("📧 Email do usuário:", userEmail)
      
      // Map emails directly to departments
      const emailToDepartment: Record<string, string> = {
        'igorzimpel@gmail.com': 'igor',
        'italonsbarrozo@gmail.com': 'italo',
        'cleliolucas@gmail.com': 'edicao',
        'danilo.dlisboa@gmail.com': 'edicao',
        'rluciano158@hotmail.com': 'copy',
        'artur.diniz1@gmail.com': 'trafego'
      }
      
      if (userEmail && emailToDepartment[userEmail]) {
        currentUserDepartment = emailToDepartment[userEmail]
        console.log("✅ Departamento determinado por email:", currentUserDepartment)
      } else {
        // Fallback to profile lookup
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUserId)
            .single()
          
          // Map roles to departments
          const roleToDepartment: Record<string, string> = {
            'copy': 'copy',
            'trafego': 'trafego', 
            'edicao': 'edicao',
            'igor': 'igor',
            'italo': 'italo'
          }
          
          if (profile?.role && roleToDepartment[profile.role]) {
            currentUserDepartment = roleToDepartment[profile.role]
            console.log("✅ Departamento determinado por profile role:", currentUserDepartment)
          }
        } catch (error) {
          console.log("⚠️ Não foi possível determinar departamento do usuário, usando 'particular'")
        }
      }
      
      console.log("🏢 Departamento do usuário atual:", currentUserDepartment)

      // Task 1: "Sent" task (appears in current user's department)
      const sentTaskData = {
        user_id: currentUserId,
        title: `📤 ${params.title}`,
        description: JSON.stringify({
          content: `Solicitação enviada para ${params.targetDepartmentName}`,
          targetDepartment: params.targetDepartmentName
        }),
        tag: `kanban-${currentUserDepartment}`, // Set to current user's department
        status: "pending" as Status,
        priority: (params.priority || null) as Priority,
        kanban_column: "todo", // Vai para a coluna Pendentes
        assignee_id: currentUserId, // Sender remains as primary assignee for tracking
        due_date: params.dueDate || null,
        created_at: timestamp,
        updated_at: timestamp
      }

      // Task 2: "Received" task (appears in target department)
      const receivedTaskData = {
        user_id: currentUserId, // Keep original creator for tracking
        title: params.title,
        description: JSON.stringify({
          content: `Solicitação recebida de ${currentUserDepartment}`,
          fromDepartment: currentUserDepartment
        }),
        tag: `kanban-${params.targetDepartment}`,
        status: "pending" as Status,
        priority: (params.priority || null) as Priority,
        kanban_column: "todo", // Vai para a coluna Pendentes
        assignee_id: (params.assigneeIds && params.assigneeIds.length > 0) ? params.assigneeIds[0] : null, // Primary assignee
        due_date: params.dueDate || null,
        created_at: timestamp,
        updated_at: timestamp
      }

      // Generate unique IDs for the tasks
      const sentTaskId = crypto.randomUUID()
      const receivedTaskId = crypto.randomUUID()
      
      // Add IDs to task data
      const sentTaskWithId = { ...sentTaskData, id: sentTaskId }
      const receivedTaskWithId = { ...receivedTaskData, id: receivedTaskId }
      
      console.log("📝 Inserindo tarefas com IDs:", { sentTaskId, receivedTaskId })
      
      // Insert first task without select
      const { error: sentError } = await supabase
        .from('tasks')
        .insert(sentTaskWithId)

      if (sentError) {
        console.error("❌ Erro ao inserir tarefa enviada:", sentError)
        throw new Error(sentError.message)
      }

      // Insert second task without select
      const { error: receivedError } = await supabase
        .from('tasks')
        .insert(receivedTaskWithId)

      if (receivedError) {
        console.error("❌ Erro ao inserir tarefa recebida:", receivedError)
        // Se a segunda falhar, tentar remover a primeira
        await supabase.from('tasks').delete().eq('id', sentTaskId)
        throw new Error(receivedError.message)
      }

      console.log("✅ Tarefas inseridas com sucesso!")
      
      // Create task objects for linking
      const sentTask = sentTaskWithId as Task
      const receivedTask = receivedTaskWithId as Task

      // Update both tasks with linked_task_id references
      console.log("🔗 Linkando tarefas...")
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ linked_task_id: receivedTask.id })
        .eq('id', sentTask.id)

      if (updateError) {
        console.error("❌ Erro ao linkar tarefa enviada:", updateError)
        throw new Error(updateError.message)
      }

      const { error: updateError2 } = await supabase
        .from('tasks')
        .update({ linked_task_id: sentTask.id })
        .eq('id', receivedTask.id)

      if (updateError2) {
        console.error("❌ Erro ao linkar tarefa recebida:", updateError2)
        throw new Error(updateError2.message)
      }

      console.log("🔗 Tarefas linkadas com sucesso!")

      // Update local state with the new tasks
      const updatedSentTask = { ...sentTask, linked_task_id: receivedTask.id } as Task
      const updatedReceivedTask = { ...receivedTask, linked_task_id: sentTask.id } as Task

      console.log("📊 Adicionando tarefas ao estado local:", { updatedSentTask, updatedReceivedTask })
      console.log("📊 Estado atual das tarefas ANTES da adição:", tasks.length, "tarefas")
      
      setTasks(prev => {
        const newTasks = [...prev, updatedSentTask, updatedReceivedTask]
        console.log("📊 Estado das tarefas DEPOIS da adição:", newTasks.length, "tarefas")
        console.log("📊 Tarefas enviadas e recebidas adicionadas:", {
          sentTitle: updatedSentTask.title,
          sentTag: updatedSentTask.tag,
          receivedTitle: updatedReceivedTask.title,
          receivedTag: updatedReceivedTask.tag
        })
        return newTasks
      })

      return {
        sentTask: updatedSentTask,
        receivedTask: updatedReceivedTask
      }

    } catch (error: any) {
      toast({
        title: "Erro ao criar solicitação",
        description: error.message || "Falha inesperada",
        variant: "destructive",
      })
      throw error
    }
  }

  // Task Groups functions
  const getTaskGroups = useCallback(async () => {
    if (!userId) return []
    
    // TODO: Implementar tabela task_groups no Supabase
    // Por enquanto, retorna array vazio para evitar erro 404
    return []
  }, [userId])

  const createTaskGroup = useCallback(async (groupData: { name: string; description?: string; color?: string; icon?: string }) => {
    if (!userId) return null
    
    // TODO: Implementar tabela task_groups no Supabase
    // Por enquanto, retorna null para evitar erro 404
    return null
  }, [userId])

  const updateTaskGroup = useCallback(async (groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'description' | 'color' | 'icon'>>) => {
    // TODO: Implementar tabela task_groups no Supabase
    // Por enquanto, retorna null para evitar erro 404
    return null
  }, [userId])

  const deleteTaskGroup = useCallback(async (groupId: string) => {
    // TODO: Implementar tabela task_groups no Supabase
    // Por enquanto, não faz nada para evitar erro 404
  }, [userId])

  const moveTaskGroup = useCallback(async (groupId: string, newPosition: number) => {
    // TODO: Implementar tabela task_groups no Supabase
    // Por enquanto, não faz nada para evitar erro 404
  }, [userId])

  const getTasksByGroup = useCallback((groupId: string | null) => {
    return tasks.filter(task => task.group_id === groupId)
  }, [tasks])

  // Load task groups when userId changes
  useEffect(() => {
    if (userId) {
      getTaskGroups().then(setTaskGroups)
    } else {
      setTaskGroups([])
    }
  }, [userId, getTaskGroups])

  const value: Ctx = {
    userId,
    tasks,
    members,
    taskGroups,
    loading,
    counts,
    getPersonalCounts,
    toggleStatus,
    addTask,
    addExamples,
    updateTask,
    deleteTask,
    createVariation,
    createVariationFromVariation,
    duplicateTask,
    createReedition,
    addComment,
    deleteComment,
    createLinkedTasks,
    getKanbanColumns,
    createKanbanColumn,
    updateKanbanColumn,
    deleteKanbanColumn,
    getTaskGroups,
    createTaskGroup,
    updateTaskGroup,
    deleteTaskGroup,
    moveTaskGroup,
    getTasksByGroup,
  }

  return <TaskDataContext.Provider value={value}>{children}</TaskDataContext.Provider>
}

export function useTaskData() {
  const ctx = useContext(TaskDataContext)
  if (!ctx) throw new Error("useTaskData must be used within TaskDataProvider")
  return ctx
}
