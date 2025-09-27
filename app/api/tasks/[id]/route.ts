import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()
    if (taskError) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // Atualizar task
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()
    if (updateError) {
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
    }
    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // Deletar task
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id)
    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}