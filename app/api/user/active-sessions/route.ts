import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !service) {
      return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Buscar sessões ativas do usuário atual com informações da tarefa
    const { data: activeSessions, error: sessionError } = await admin
      .from("task_time_sessions")
      .select(`
        id,
        task_id,
        user_id,
        start_time,
        end_time,
        tasks!inner (
          id,
          title,
          status
        )
      `)
      .eq("user_id", userData.user.id)
      .is("end_time", null)
      .order("start_time", { ascending: false })

    if (sessionError) {
      console.error("Erro ao buscar sessões ativas:", sessionError)
      return NextResponse.json({ error: "Erro ao buscar sessões ativas" }, { status: 500 })
    }

    // Formatar dados para o frontend
    const formattedSessions = (activeSessions || []).map(session => ({
      id: session.id,
      task_id: session.task_id,
      start_time: session.start_time,
      task_title: session.tasks?.title || "Tarefa sem título"
    }))

    return NextResponse.json({
      success: true,
      activeSessions: formattedSessions,
      count: formattedSessions.length
    })

  } catch (error: any) {
    console.error("Erro interno ao buscar sessões ativas:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}