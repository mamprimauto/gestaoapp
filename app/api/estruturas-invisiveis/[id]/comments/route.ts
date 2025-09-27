import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GET - Obter comentários de uma estrutura
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Get comments with user profiles and replies
    const { data: comments, error } = await admin
      .from('estruturas_invisiveis_comments')
      .select(`
        *,
        profiles!estruturas_invisiveis_comments_user_id_fkey (
          id,
          name,
          avatar_url
        ),
        estruturas_invisiveis_comment_replies (
          *,
          profiles!estruturas_invisiveis_comment_replies_user_id_fkey (
            id,
            name,
            avatar_url
          )
        )
      `)
      .eq('estrutura_id', params.id)
      .order('selection_start', { ascending: true })
      .order('created_at', { foreignTable: 'estruturas_invisiveis_comment_replies', ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: "Error fetching comments" }, { status: 500 })
    }

    return NextResponse.json(comments)
  } catch (error) {
    console.error("Error in GET /api/estruturas-invisiveis/[id]/comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Criar novo comentário
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const { content, selection_start, selection_end, selected_text } = body

    if (!content || typeof selection_start !== 'number' || typeof selection_end !== 'number' || !selected_text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user owns the estrutura
    const { data: estrutura, error: estruturaError } = await admin
      .from('estruturas_invisiveis')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (estruturaError || !estrutura) {
      return NextResponse.json({ error: "Estrutura not found" }, { status: 404 })
    }

    if (estrutura.user_id !== userData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create comment
    const { data: comment, error } = await admin
      .from('estruturas_invisiveis_comments')
      .insert({
        estrutura_id: params.id,
        user_id: userData.user.id,
        content,
        selection_start,
        selection_end,
        selected_text
      })
      .select(`
        *,
        profiles!estruturas_invisiveis_comments_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: "Error creating comment" }, { status: 500 })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/estruturas-invisiveis/[id]/comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}