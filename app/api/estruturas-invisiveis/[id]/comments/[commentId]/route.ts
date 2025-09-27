import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// PATCH - Atualizar comentário (marcar como resolvido, editar conteúdo)
export async function PATCH(
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
    const { content, resolved } = body

    // Build update object
    const updateData: any = {}
    if (content !== undefined) updateData.content = content
    if (resolved !== undefined) updateData.resolved = resolved

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Update comment
    const { data: comment, error } = await admin
      .from('estruturas_invisiveis_comments')
      .update(updateData)
      .eq('id', params.commentId)
      .eq('user_id', userData.user.id) // Only owner can update
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Comment not found or access denied" }, { status: 404 })
      }
      console.error('Error updating comment:', error)
      return NextResponse.json({ error: "Error updating comment" }, { status: 500 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error("Error in PATCH /api/estruturas-invisiveis/[id]/comments/[commentId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Deletar comentário
export async function DELETE(
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

    // Delete comment (cascade will delete replies)
    const { error } = await admin
      .from('estruturas_invisiveis_comments')
      .delete()
      .eq('id', params.commentId)
      .eq('user_id', userData.user.id) // Only owner can delete

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json({ error: "Error deleting comment" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/estruturas-invisiveis/[id]/comments/[commentId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}