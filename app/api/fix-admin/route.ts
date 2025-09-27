import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

    // Update the current user to be admin and approved
    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({
        role: 'admin',
        approved: true
      })
      .eq('id', userData.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: "Error updating profile" }, { status: 500 })
    }

    // Also ensure any user with igor in email is admin
    if (userData.user.email?.includes('igor')) {
      await admin
        .from('profiles')
        .update({
          role: 'admin',
          approved: true
        })
        .ilike('email', '%igor%')
    }

    return NextResponse.json({
      message: "Admin role configurado com sucesso!",
      profile: updated
    })

  } catch (error) {
    console.error('Error fixing admin:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}