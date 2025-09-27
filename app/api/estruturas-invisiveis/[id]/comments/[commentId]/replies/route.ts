import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GET - Obter respostas de um comentário
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string, commentId: string } }
) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !service) {
      return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
    }

    // Get auth token from request
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createClient(url, service, { 
      auth: { persistSession: false, autoRefreshToken: false } 
    })

    // Verify user token
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get replies with user profiles
    const { data: replies, error } = await admin
      .from('estruturas_invisiveis_comment_replies')
      .select(`
        *,
        profiles!estruturas_invisiveis_comment_replies_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .eq('comment_id', params.commentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching replies:', error)
      return NextResponse.json({ error: "Error fetching replies" }, { status: 500 })
    }

    return NextResponse.json(replies)
  } catch (error) {
    console.error("Error in GET /api/estruturas-invisiveis/[id]/comments/[commentId]/replies:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Criar nova resposta
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string, commentId: string } }
) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !service) {
      return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
    }

    // Get auth token from request
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createClient(url, service, { 
      auth: { persistSession: false, autoRefreshToken: false } 
    })

    // Verify user token
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await req.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify comment exists and user has access to the estrutura
    const { data: comment, error: commentError } = await admin
      .from('estruturas_invisiveis_comments')
      .select(`
        id,
        estruturas_invisiveis!inner (
          user_id
        )
      `)
      .eq('id', params.commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    if (comment.estruturas_invisiveis.user_id !== userData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create reply
    const { data: reply, error } = await admin
      .from('estruturas_invisiveis_comment_replies')
      .insert({
        comment_id: params.commentId,
        user_id: userData.user.id,
        content
      })
      .select(`
        *,
        profiles!estruturas_invisiveis_comment_replies_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating reply:', error)
      return NextResponse.json({ error: "Error creating reply" }, { status: 500 })
    }

    return NextResponse.json(reply, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/estruturas-invisiveis/[id]/comments/[commentId]/replies:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}