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

    // Get user profile to check role
    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single()

    if (profileError || !profileData) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Filter dailys based on user role
    let query = admin
      .from('dailys')
      .select('*')
      .order('date', { ascending: false })
      .limit(50) // Limit to last 50 dailys for performance

    // If user is editor, only show editores dailys
    if (profileData.role === 'editor') {
      query = query.eq('daily_type', 'editores')
    }

    const { data: dailys, error } = await query

    if (error) {
      console.error('Error fetching dailys:', error)
      return NextResponse.json({ error: "Error fetching dailys" }, { status: 500 })
    }

    return NextResponse.json({
      dailys: dailys || []
    })

  } catch (error) {
    console.error('Error in GET /api/dailys:', error)
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
    if (!body.date) {
      return NextResponse.json({ 
        error: "Data é obrigatória" 
      }, { status: 400 })
    }

    // Allow multiple dailys per day - only check for specific type if needed
    // This allows creating multiple dailys of the same type on the same day if required
    // (e.g., morning and afternoon Copy & Gestor dailys)

    // Prepare data for insertion  
    const dailyData = {
      user_id: userData.user.id,
      date: body.date,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      duration_minutes: body.duration_minutes || null,
      attendance: body.attendance || [],
      company_focus: body.company_focus || '',
      next_steps: body.next_steps || '',
      challenges: body.challenges || '',
      individual_priorities: body.individual_priorities || {},
      ai_summary: body.ai_summary || '',
      is_active: body.is_active || false,
      timer_start_time: body.timer_start_time || null,
      daily_type: body.daily_type || 'copy_gestor'
    }

    const { data: newDaily, error } = await admin
      .from('dailys')
      .insert(dailyData)
      .select()
      .single()

    if (error) {
      console.error('Error creating daily:', error)
      return NextResponse.json({ error: "Error creating daily" }, { status: 500 })
    }

    return NextResponse.json({ 
      daily: newDaily,
      message: "Daily criada com sucesso" 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/dailys:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}