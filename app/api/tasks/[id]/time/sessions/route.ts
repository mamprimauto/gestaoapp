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
    
    const userId = userData.user.id
    const taskId = params.id
    if (!taskId) {
      return NextResponse.json({ error: "Task ID é obrigatório" }, { status: 400 })
    }
    // Verificar apenas se a task existe (sistema interno)
    const { data: task, error: taskError } = await admin
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .single()
    if (taskError || !task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }
    // Buscar todas as sessões de tempo para esta task com informações dos usuários
    const { data: sessions, error: sessionsError } = await admin
      .from("task_time_sessions")
      .select(`
        *,
        user:profiles(id, name, email, avatar_url)
      `)
      .eq("task_id", taskId)
      .order("start_time", { ascending: false })
    if (sessionsError) {
      return NextResponse.json({ error: "Erro ao buscar sessões" }, { status: 500 })
    }
    // Calcular estatísticas
    const completedSessions = sessions.filter(s => s.end_time !== null)
    const activeSessions = sessions.filter(s => s.end_time === null)
    const userActiveSession = activeSessions.find(s => s.user_id === userId)
    
    const totalSeconds = completedSessions.reduce((acc, session) => acc + (session.duration_seconds || 0), 0)
    
    // Calcular tempo total incluindo sessões ativas
    let currentActiveSeconds = 0
    activeSessions.forEach(session => {
      const now = new Date()
      const start = new Date(session.start_time)
      currentActiveSeconds += Math.floor((now.getTime() - start.getTime()) / 1000)
    })
    
    const totalWithActive = totalSeconds + currentActiveSeconds
    
    // Informações sobre usuários ativos
    const activeUsers = activeSessions.map(session => ({
      user: session.user,
      sessionId: session.id,
      startTime: session.start_time,
      currentDuration: Math.floor((new Date().getTime() - new Date(session.start_time).getTime()) / 1000)
    }))
    
    return NextResponse.json({
      sessions,
      stats: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        activeSessions: activeSessions.length,
        totalSeconds: totalSeconds,
        totalWithActiveSeconds: totalWithActive,
        hasActiveSession: !!userActiveSession,
        activeSession: userActiveSession || null,
        activeUsers: activeUsers
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}