import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(
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

    // Verificar se a task existe
    const { data: task, error: taskError } = await admin
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .single()
    
    if (taskError || !task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    // Deletar todas as sessões de tempo para esta task e usuário
    const { error: deleteError } = await admin
      .from("task_time_sessions")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", userId)

    if (deleteError) {
      return NextResponse.json({ error: "Erro ao resetar timer" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Timer resetado com sucesso"
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}