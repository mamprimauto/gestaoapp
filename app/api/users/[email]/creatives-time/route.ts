import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request, { params }: { params: { email: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const userEmail = decodeURIComponent(params.email)
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: "Date parameter is required (YYYY-MM-DD)" }, { status: 400 })
    }

    // Buscar o usuário pelo email e seu nome para gerar iniciais corretas
    const { data: user, error: userError } = await admin
      .from("profiles")
      .select("id, name")
      .eq("email", userEmail)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calcular o início e fim do dia no fuso horário de Brasília
    const startOfDay = `${date}T00:00:00-03:00`
    const endOfDay = `${date}T23:59:59-03:00`

    // Buscar todas as tarefas de criativos do usuário (onde ele é assignee ou responsável por copy/edição)
    // Primeiro buscar tarefas com tag 'criativos'
    const { data: creativeTasks, error: tasksError } = await admin
      .from("tasks")
      .select("id, description, assignee_id")
      .eq("tag", "criativos")

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }

    // Filtrar tarefas onde o usuário está envolvido (como assignee ou nas iniciais)
    const userCreativeTasks = creativeTasks?.filter(task => {
      // Verificar se é assignee
      if (task.assignee_id === user.id) {
        return true
      }

      // Verificar se está nas iniciais do copy ou editor
      try {
        const taskData = JSON.parse(task.description || '{}')
        const copyInitials = taskData.iniciais_copy || ''
        const editorInitials = taskData.iniciais_editor || ''
        
        // Gerar iniciais do usuário para comparação (usando a mesma lógica do frontend)
        const userInitials = user.name && user.name.trim() 
          ? user.name.trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase())
              .slice(0, 2)
              .join('')
          : userEmail.substring(0, 2).toUpperCase()
        
        return copyInitials === userInitials || editorInitials === userInitials
      } catch {
        return false
      }
    }) || []

    if (userCreativeTasks.length === 0) {
      return NextResponse.json({ sessions: [] })
    }

    // Buscar sessões de timer para essas tarefas criativas
    const taskIds = userCreativeTasks.map(task => task.id)
    const { data: sessions, error: sessionsError } = await admin
      .from("task_time_sessions")
      .select("*")
      .in("task_id", taskIds)
      .eq("user_id", user.id)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay)
      .order("start_time", { ascending: false })

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}