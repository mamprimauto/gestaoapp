import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GET - Obter uma estrutura específica
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

    const { data: estrutura, error } = await admin
      .from('estruturas_invisiveis')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userData.user.id) // Ensure user can only access their own structures
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Estrutura não encontrada" }, { status: 404 })
      }
      console.error('Error fetching estrutura:', error)
      return NextResponse.json({ error: "Error fetching estrutura" }, { status: 500 })
    }

    return NextResponse.json(estrutura)

  } catch (error) {
    console.error('Error in GET /api/estruturas-invisiveis/[id]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Atualizar uma estrutura
export async function PUT(
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

    // Validate required fields
    if (!body.titulo || (!body.conteudo && !body.conteudo_text)) {
      return NextResponse.json({ 
        error: "Título e conteúdo são obrigatórios" 
      }, { status: 400 })
    }

    // Prepare update data (tipo is not editable after creation)
    const updateData = {
      titulo: body.titulo,
      conteudo: body.conteudo || body.conteudo_text, // Store Quill delta or plain text
      conteudo_text: body.conteudo_text || body.conteudo, // Store plain text for search
      anotacoes: body.anotacoes || []
    }

    const { data: updatedEstrutura, error } = await admin
      .from('estruturas_invisiveis')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userData.user.id) // Ensure user can only update their own structures
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Estrutura não encontrada" }, { status: 404 })
      }
      console.error('Error updating estrutura:', error)
      return NextResponse.json({ error: "Error updating estrutura" }, { status: 500 })
    }

    return NextResponse.json({ 
      estrutura: updatedEstrutura,
      message: "Estrutura atualizada com sucesso" 
    })

  } catch (error) {
    console.error('Error in PUT /api/estruturas-invisiveis/[id]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Deletar uma estrutura
export async function DELETE(
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

    const { error } = await admin
      .from('estruturas_invisiveis')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userData.user.id) // Ensure user can only delete their own structures

    if (error) {
      console.error('Error deleting estrutura:', error)
      return NextResponse.json({ error: "Error deleting estrutura" }, { status: 500 })
    }

    return NextResponse.json({ message: "Estrutura deletada com sucesso" })

  } catch (error) {
    console.error('Error in DELETE /api/estruturas-invisiveis/[id]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}