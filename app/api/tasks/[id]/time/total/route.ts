import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const taskId = params.id
    if (!taskId) {
      return NextResponse.json({ error: "Task ID é obrigatório" }, { status: 400 })
    }
    // Verificar se a task existe (sem verificação de permissão - sistema interno)
    const { data: task, error: taskError } = await admin
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .single()
    if (taskError || !task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }
    // Sistema interno - qualquer usuário autenticado pode ver o tempo
    // Buscar sessões completas e calcular total
    const { data: completedSessions, error: completedError } = await admin
      .from("task_time_sessions")
      .select("duration_seconds")
      .eq("task_id", taskId)
      .eq("user_id", userData.user.id)
      .not("end_time", "is", null)
    if (completedError) {
      return NextResponse.json({ error: "Erro ao calcular tempo total" }, { status: 500 })
    }
    // Buscar sessão ativa (se houver)
    const { data: activeSession, error: activeError } = await admin
      .from("task_time_sessions")
      .select("start_time")
      .eq("task_id", taskId)
      .eq("user_id", userData.user.id)
      .is("end_time", null)
      .single()
    if (activeError && activeError.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({ error: "Erro ao buscar sessão ativa" }, { status: 500 })
    }
    // Calcular total de segundos das sessões completas
    const totalCompletedSeconds = completedSessions.reduce((acc, session) => acc + (session.duration_seconds || 0), 0)
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
    return NextResponse.json({
      totalSeconds,
      totalCompletedSeconds,
      activeSeconds,
      formatted: formatTime(totalSeconds),
      formattedCompleted: formatTime(totalCompletedSeconds),
      formattedActive: formatTime(activeSeconds),
      hasActiveSession: !!activeSession,
      completedSessionsCount: completedSessions.length
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}