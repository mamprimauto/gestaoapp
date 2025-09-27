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

    // Get all dailys with fake attendance data
    const { data: dailys, error: fetchError } = await admin
      .from('dailys')
      .select('*')
      .not('attendance', 'is', null)

    if (fetchError) {
      console.error('Error fetching dailys:', fetchError)
      return NextResponse.json({ error: "Error fetching dailys" }, { status: 500 })
    }

    let fixedCount = 0
    const fakeAttendees = ['Igor Zimpel', 'Italo Barrozo', 'Edson Nogueira', 'Artur Luciano']

    // Check and clean each daily
    for (const daily of dailys || []) {
      if (!daily.attendance || !Array.isArray(daily.attendance)) continue

      // Check if this has fake data (all the same fake names)
      const hasFakeData = daily.attendance.some((attendee: any) =>
        fakeAttendees.includes(attendee.name) &&
        !attendee.user_id &&
        !attendee.avatar_url
      )

      if (hasFakeData) {
        // Clear fake attendance data (keep empty array so daily can be re-populated)
        const { error: updateError } = await admin
          .from('dailys')
          .update({ attendance: [] })
          .eq('id', daily.id)

        if (!updateError) {
          fixedCount++
          console.log(`Cleaned fake attendance from daily ${daily.id} (${daily.date})`)
        }
      }
    }

    return NextResponse.json({
      message: `Limpeza concluída. ${fixedCount} dailys com dados fictícios foram limpas.`,
      fixed: fixedCount,
      total: dailys?.length || 0
    })

  } catch (error) {
    console.error('Error fixing attendance:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}