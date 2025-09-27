import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  const swipeFileId = params.id

  try {
    // Verificar se o swipe file existe
    const { data: swipeFile, error: swipeErr } = await admin
      .from("swipe_files")
      .select("id")
      .eq("id", swipeFileId)
      .maybeSingle()

    if (swipeErr) return NextResponse.json({ error: swipeErr.message }, { status: 500 })
    if (!swipeFile) return NextResponse.json({ error: "Swipe file not found" }, { status: 404 })

    // Buscar comentários com informações do usuário
    const { data: comments, error: commentsErr } = await admin
      .from("swipe_file_comments")
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
      .eq("swipe_file_id", swipeFileId)
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

  const swipeFileId = params.id

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

    // Verificar se o swipe file existe
    const { data: swipeFile, error: swipeErr } = await admin
      .from("swipe_files")
      .select("id")
      .eq("id", swipeFileId)
      .maybeSingle()

    if (swipeErr) return NextResponse.json({ error: swipeErr.message }, { status: 500 })
    if (!swipeFile) return NextResponse.json({ error: "Swipe file not found" }, { status: 404 })

    // Criar comentário - usar user_id do body se fornecido, senão usar um ID fixo para sistema interno
    const commentData = {
      swipe_file_id: swipeFileId,
      user_id: user_id || "00000000-0000-0000-0000-000000000000", // ID fixo para sistema interno
      content: content?.trim() || "",
      ...(image_url && { image_url: image_url.trim() })
    }

    const { data: comment, error: commentErr } = await admin
      .from("swipe_file_comments")
      .insert(commentData)
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

    if (commentErr) return NextResponse.json({ error: commentErr.message }, { status: 500 })

    return NextResponse.json({ comment })
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
      .from("swipe_file_comments")
      .select("id, user_id, swipe_file_id")
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
      .from("swipe_file_comments")
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