import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // Buscar todas as tasks do usuário
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (tasksError) {
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }
    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json()
    // Criar nova task
    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: body.title || "Nova tarefa",
        description: body.description || null,
        tag: body.tag || null,
        owner: body.owner || null,
        due_date: body.due_date || null,
        status: body.status || "pending",
        priority: body.priority || null,
        assignee_id: body.assignee_id || null,
      })
      .select()
      .single()
    if (insertError) {
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
    }
    return NextResponse.json({ task: newTask })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}