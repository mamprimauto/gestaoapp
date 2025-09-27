import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  const taskId = params.id

  try {
    // Buscar comentários apenas da tarefa atual para evitar duplicação
    const { data: comments, error: commentsErr } = await admin
      .from("task_comments")
      .select(`
        id,
        content,
        image_url,
        created_at,
        updated_at,
        user_id,
        task_id,
        user:profiles!user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })

    if (commentsErr) return NextResponse.json({ error: commentsErr.message }, { status: 500 })

    return NextResponse.json({ comments: comments || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  const taskId = params.id

  try {
    const body = await req.json()
    const { content, image_url, user_id } = body

    if ((!content || typeof content !== "string" || content.trim().length === 0) && !image_url) {
      return NextResponse.json({ error: "Content or image is required" }, { status: 400 })
    }

    // Validar image_url se fornecida
    if (image_url && (typeof image_url !== "string" || !image_url.trim())) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
    }

    // Verificar se a task existe e obter linked_task_id
    const { data: task, error: taskErr } = await admin
      .from("tasks")
      .select("id, linked_task_id")
      .eq("id", taskId)
      .maybeSingle()

    if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    // Criar comentário(s) - um para a task atual e outro para a linked task (se existir)
    const baseCommentData = {
      user_id: user_id || "00000000-0000-0000-0000-000000000000", // ID fixo para sistema interno
      content: content?.trim() || "",
      ...(image_url && { image_url: image_url.trim() })
    }

    // Preparar comentários para inserir
    const commentsToInsert = [
      { ...baseCommentData, task_id: taskId }
    ]

    // Se existe uma linked task, adicionar comentário lá também
    if (task.linked_task_id) {
      commentsToInsert.push({ 
        ...baseCommentData, 
        task_id: task.linked_task_id 
      })
    }

    const { data: comments, error: commentErr } = await admin
      .from("task_comments")
      .insert(commentsToInsert)
      .select(`
        id,
        content,
        image_url,
        created_at,
        updated_at,
        user_id,
        user:profiles!user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)

    if (commentErr) return NextResponse.json({ error: commentErr.message }, { status: 500 })

    // Return the first comment (the one for the current task)
    const currentTaskComment = comments?.find(c => c.task_id === taskId) || comments?.[0]
    
    return NextResponse.json({ comment: currentTaskComment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const body = await req.json()
    const { comment_id, user_id } = body

    if (!comment_id) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 })
    }

    // Buscar o comentário para verificar o proprietário
    const { data: comment, error: commentErr } = await admin
      .from("task_comments")
      .select("id, user_id, task_id")
      .eq("id", comment_id)
      .single()

    if (commentErr || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Verificar se o usuário é o dono do comentário
    if (user_id && comment.user_id !== user_id) {
      return NextResponse.json({ error: "Forbidden - You can only delete your own comments" }, { status: 403 })
    }

    // Deletar o comentário
    const { error: deleteErr } = await admin
      .from("task_comments")
      .delete()
      .eq("id", comment_id)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Comment deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const body = await req.json()
    const { comment_id, content, user_id } = body

    if (!comment_id) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 })
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Buscar o comentário para verificar o proprietário
    const { data: comment, error: commentErr } = await admin
      .from("task_comments")
      .select("id, user_id, task_id")
      .eq("id", comment_id)
      .single()

    if (commentErr || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Verificar se o usuário é o dono do comentário
    if (user_id && comment.user_id !== user_id) {
      return NextResponse.json({ error: "Forbidden - You can only edit your own comments" }, { status: 403 })
    }

    // Atualizar o comentário
    const { data: updatedComment, error: updateErr } = await admin
      .from("task_comments")
      .update({ 
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", comment_id)
      .select(`
        id,
        content,
        image_url,
        created_at,
        updated_at,
        user_id,
        user:profiles!user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ comment: updatedComment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}