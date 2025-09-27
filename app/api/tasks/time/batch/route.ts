import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(req: NextRequest) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    // Pegar lista de task IDs do body
    const { taskIds } = await req.json()
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "taskIds array é obrigatório" }, { status: 400 })
    }
    // Limitar a 100 tasks por vez para evitar sobrecarga
    const limitedTaskIds = taskIds.slice(0, 100)
    // Buscar tarefas, organizações do usuário e sessões em paralelo
    const [tasksResult, userOrgsResult, sessionsResult] = await Promise.all([
      admin
        .from("tasks")
        .select("id, user_id, assignee_id, organization_id")
        .in("id", limitedTaskIds),
      admin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userData.user.id),
      admin
        .from("task_time_sessions")
        .select("task_id, duration_seconds, start_time, end_time")
        .in("task_id", limitedTaskIds)
        .eq("user_id", userData.user.id)
    ])
    const { data: tasks, error: tasksError } = tasksResult
    const { data: userOrgs } = userOrgsResult
    const { data: allSessions, error: sessionsError } = sessionsResult
    if (tasksError) {
      return NextResponse.json({ error: "Erro ao buscar tarefas" }, { status: 500 })
    }
    if (sessionsError) {
      return NextResponse.json({ error: "Erro ao buscar sessões de tempo" }, { status: 500 })
    }
    const userOrgIds = userOrgs?.map(o => o.organization_id) || []
    // Filtrar tarefas que o usuário tem permissão
    const allowedTasks = tasks?.filter(task => 
      task.user_id === userData.user.id || 
      task.assignee_id === userData.user.id || 
      userOrgIds.includes(task.organization_id)
    ) || []
    const allowedTaskIds = allowedTasks.map(t => t.id)
    if (allowedTaskIds.length === 0) {
      return NextResponse.json({ times: {} })
    }
    // Processar resultados por task
    const timesByTask: Record<string, any> = {}
    for (const taskId of allowedTaskIds) {
      const taskSessions = allSessions?.filter(s => s.task_id === taskId) || []
      // Separar sessões completadas e ativas
      const completedSessions = taskSessions.filter(s => s.end_time !== null)
      const activeSession = taskSessions.find(s => s.end_time === null)
      // Calcular total de segundos das sessões completas
      const totalCompletedSeconds = completedSessions.reduce(
        (acc, session) => acc + (session.duration_seconds || 0), 
        0
      )
      // Calcular tempo da sessão ativa (se houver)
      let activeSeconds = 0
      if (activeSession) {
        const now = new Date()
        const start = new Date(activeSession.start_time)
        activeSeconds = Math.floor((now.getTime() - start.getTime()) / 1000)
      }
      const totalSeconds = totalCompletedSeconds + activeSeconds
      // Formatar tempo em HH:MM:SS
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      timesByTask[taskId] = {
        totalSeconds,
        totalCompletedSeconds,
        activeSeconds,
        formatted: formatTime(totalSeconds),
        formattedCompleted: formatTime(totalCompletedSeconds),
        formattedActive: formatTime(activeSeconds),
        hasActiveSession: !!activeSession,
        completedSessionsCount: completedSessions.length
      }
    }
    // Adicionar placeholders para tasks sem permissão ou sem dados
    for (const taskId of limitedTaskIds) {
      if (!timesByTask[taskId]) {
        timesByTask[taskId] = {
          totalSeconds: 0,
          formatted: "00:00:00",
          hasActiveSession: false,
          error: "No data or permission"
        }
      }
    }
    return NextResponse.json({ times: timesByTask })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}