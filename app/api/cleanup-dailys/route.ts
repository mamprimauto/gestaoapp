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

    // Verify user token and check if admin
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single()

    if (profileError || !profileData || profileData.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 })
    }

    // Delete fictitious dailys with 30 minutes duration and suspicious data
    const { data: deleted1, error: error1 } = await admin
      .from('dailys')
      .delete()
      .eq('duration_minutes', 30)
      .or('start_time.is.null,end_time.is.null')
      .or('attendance.eq.[]')
      .select()

    // Delete old incomplete dailys (older than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: deleted2, error: error2 } = await admin
      .from('dailys')
      .delete()
      .is('duration_minutes', null)
      .is('end_time', null)
      .eq('is_active', false)
      .lt('created_at', sevenDaysAgo.toISOString())
      .select()

    const totalDeleted = (deleted1?.length || 0) + (deleted2?.length || 0)

    return NextResponse.json({
      message: `Limpeza concluída. ${totalDeleted} dailys fictícias removidas.`,
      deletedFake: deleted1?.length || 0,
      deletedOld: deleted2?.length || 0
    })

  } catch (error) {
    console.error('Error cleaning up dailys:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}