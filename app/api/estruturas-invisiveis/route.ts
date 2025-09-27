import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
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

    // Get user profile
    const { data: userProfile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userData.user.id)
      .single()

    // Simple query - just get all user's structures ordered by creation date
    const { data: estruturas, error } = await admin
      .from('estruturas_invisiveis')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching estruturas:', error)
      return NextResponse.json({ error: "Error fetching estruturas" }, { status: 500 })
    }

    // Add user profile to each estrutura
    const estruturasWithProfile = estruturas?.map(estrutura => ({
      ...estrutura,
      user_profile: userProfile
    })) || []

    return NextResponse.json({
      estruturas: estruturasWithProfile
    })

  } catch (error) {
    console.error('Error in GET /api/estruturas-invisiveis:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

    // Prepare data for insertion  
    const estruturaData = {
      titulo: body.titulo,
      conteudo: body.conteudo || body.conteudo_text, // Store Quill delta or plain text
      conteudo_text: body.conteudo_text || body.conteudo, // Store plain text for search
      anotacoes: body.anotacoes || [],
      tipo: body.tipo || 'VSL', // Default to VSL if not provided
      user_id: userData.user.id
    }

    const { data: newEstrutura, error } = await admin
      .from('estruturas_invisiveis')
      .insert(estruturaData)
      .select()
      .single()

    if (error) {
      console.error('Error creating estrutura:', error)
      return NextResponse.json({ error: "Error creating estrutura" }, { status: 500 })
    }

    return NextResponse.json({ 
      estrutura: newEstrutura,
      message: "Estrutura criada com sucesso" 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/estruturas-invisiveis:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}