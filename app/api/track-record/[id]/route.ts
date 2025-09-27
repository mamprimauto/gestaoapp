import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GET - Obter uma daily específica
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

    const { data: daily, error } = await admin
      .from('dailys')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Daily não encontrada" }, { status: 404 })
      }
      console.error('Error fetching daily:', error)
      return NextResponse.json({ error: "Error fetching daily" }, { status: 500 })
    }

    return NextResponse.json(daily)

  } catch (error) {
    console.error('Error in GET /api/dailys/[id]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Atualizar uma daily
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

    // Prepare update data
    const updateData: any = {}
    
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.end_time !== undefined) updateData.end_time = body.end_time
    if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes
    if (body.attendance !== undefined) updateData.attendance = body.attendance
    if (body.company_focus !== undefined) updateData.company_focus = body.company_focus
    if (body.next_steps !== undefined) updateData.next_steps = body.next_steps
    if (body.challenges !== undefined) updateData.challenges = body.challenges
    if (body.individual_priorities !== undefined) updateData.individual_priorities = body.individual_priorities
    if (body.ai_summary !== undefined) updateData.ai_summary = body.ai_summary
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.timer_start_time !== undefined) updateData.timer_start_time = body.timer_start_time

    const { data: updatedDaily, error } = await admin
      .from('dailys')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Daily não encontrada" }, { status: 404 })
      }
      console.error('Error updating daily:', error)
      return NextResponse.json({ error: "Error updating daily" }, { status: 500 })
    }

    return NextResponse.json({ 
      daily: updatedDaily,
      message: "Daily atualizada com sucesso" 
    })

  } catch (error) {
    console.error('Error in PUT /api/dailys/[id]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Deletar uma daily
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

    // Check if user is admin
    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("role, approved")
      .eq("id", userData.user.id)
      .single()

    if (profileError || !profileData) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const isAdmin = (profileData.role === 'admin' || profileData.role === 'administrador') && profileData.approved

    if (!isAdmin) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem excluir dailys" }, { status: 403 })
    }

    const { error } = await admin
      .from('dailys')
      .delete()
      .eq('id', params.id)
      // Removed user_id filter since admins can delete any daily

    if (error) {
      console.error('Error deleting daily:', error)
      return NextResponse.json({ error: "Error deleting daily" }, { status: 500 })
    }

    return NextResponse.json({ message: "Daily deletada com sucesso" })

  } catch (error) {
    console.error('Error in DELETE /api/dailys/[id]:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}