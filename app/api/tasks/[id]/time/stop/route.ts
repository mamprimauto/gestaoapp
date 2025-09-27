import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(
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
    // Buscar apenas a sessão ativa do usuário atual
    const { data: activeSessions, error: sessionError } = await admin
      .from("task_time_sessions")
      .select("*")
      .eq("task_id", taskId)
      .eq("user_id", userData.user.id)
      .is("end_time", null)
    if (sessionError || !activeSessions || activeSessions.length === 0) {
      console.log(`STOP TIMER DEBUG: Task ${taskId}, User ${userData.user.id}, Error:`, sessionError, 'Active Sessions:', activeSessions)
      // Retornar sucesso mesmo se não há sessão ativa para evitar erro no frontend
      return NextResponse.json({ 
        success: true, 
        message: "Nenhuma sessão ativa encontrada para este usuário - timer já estava parado",
        alreadyStopped: true 
      }, { status: 200 })
    }
    // Finalizar apenas as sessões ativas do usuário atual
    const endTime = new Date().toISOString()
    const endTimestamp = new Date(endTime).getTime()
    const sessionIds = activeSessions.map(s => s.id)
    
    console.log(`STOP TIMER: Finalizando ${sessionIds.length} sessão(ões) do usuário ${userData.user.id} para task ${taskId}:`, sessionIds)
    
    // Calcular duration_seconds para cada sessão
    const sessionsWithDuration = activeSessions.map(session => {
      const startTimestamp = new Date(session.start_time).getTime()
      const durationSeconds = Math.floor((endTimestamp - startTimestamp) / 1000)
      return {
        id: session.id,
        duration_seconds: durationSeconds
      }
    })
    
    // Atualizar cada sessão com seu duration_seconds específico
    const updatePromises = sessionsWithDuration.map(async (session) => {
      return admin
        .from("task_time_sessions")
        .update({ 
          end_time: endTime,
          duration_seconds: session.duration_seconds
        })
        .eq("id", session.id)
        .select()
        .single()
    })
    
    const updateResults = await Promise.all(updatePromises)
    const updateError = updateResults.find(result => result.error)?.error
    const updatedSessions = updateResults.map(result => result.data).filter(Boolean)
    if (updateError) {
      return NextResponse.json({ error: "Erro ao finalizar sessão de tempo" }, { status: 500 })
    }
    // Calcular duração total das sessões finalizadas para retornar na notificação
    const totalDuration = sessionsWithDuration.reduce((acc, session) => acc + session.duration_seconds, 0)
    
    return NextResponse.json({ 
      success: true,
      sessions: updatedSessions,
      sessionsFinalized: sessionIds.length,
      duration_seconds: totalDuration,
      message: "Sua sessão de tempo foi finalizada"
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}