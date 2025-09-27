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
    // Sistema multi-usuário - verificar se o usuário já tem uma sessão ativa
    const { data: userActiveSession, error: activeError } = await admin
      .from("task_time_sessions")
      .select("id")
      .eq("task_id", taskId)
      .eq("user_id", userData.user.id)
      .is("end_time", null)
      .single()

    if (activeError && activeError.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({ error: "Erro ao verificar sessão ativa do usuário" }, { status: 500 })
    }

    if (userActiveSession) {
      console.log(`DEBUG START: Usuário já tem sessão ativa:`, userActiveSession.id)
      // Finalizar a sessão ativa anterior do usuário
      const endTime = new Date().toISOString()
      
      await admin
        .from("task_time_sessions")
        .update({ end_time: endTime })
        .eq("id", userActiveSession.id)
        
      console.log(`DEBUG START: Sessão anterior finalizada:`, userActiveSession.id)
    }
    // Criar nova sessão de tempo
    console.log(`DEBUG START: Criando sessão para task_id: ${taskId}, user_id: ${userData.user.id}`)
    
    const { data: newSession, error: insertError } = await admin
      .from("task_time_sessions")
      .insert({
        task_id: taskId,
        user_id: userData.user.id,
        start_time: new Date().toISOString()
      })
      .select()
      .single()
      
    console.log(`DEBUG START: Sessão criada:`, newSession)
    console.log(`DEBUG START: Erro:`, insertError)
    
    if (insertError) {
      console.log(`DEBUG START: Erro detalhado:`, insertError)
      return NextResponse.json({ error: "Erro ao criar sessão de tempo" }, { status: 500 })
    }
    return NextResponse.json({ 
      success: true,
      session: newSession,
      message: "Sessão de tempo iniciada"
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}