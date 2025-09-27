import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Helper function to calculate duration from time strings
function calculateDurationMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  // Parse times (HH:MM:SS)
  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number)
    return {
      hours: parts[0] || 0,
      minutes: parts[1] || 0,
      seconds: parts[2] || 0
    }
  }

  const start = parseTime(startTime)
  const end = parseTime(endTime)

  // Convert to total minutes (not seconds for better precision)
  const startTotalMinutes = start.hours * 60 + start.minutes + start.seconds / 60
  const endTotalMinutes = end.hours * 60 + end.minutes + end.seconds / 60

  // Calculate difference
  let diffMinutes = endTotalMinutes - startTotalMinutes

  // Handle day rollover (if end time is before start time)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60 // Add 24 hours in minutes
  }

  // Round to nearest minute
  return Math.round(diffMinutes)
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

    // Get all dailys with both start_time and end_time
    const { data: dailys, error: fetchError } = await admin
      .from('dailys')
      .select('id, start_time, end_time, duration_minutes')
      .not('start_time', 'is', null)
      .not('end_time', 'is', null)

    if (fetchError) {
      console.error('Error fetching dailys:', fetchError)
      return NextResponse.json({ error: "Error fetching dailys" }, { status: 500 })
    }

    let fixedCount = 0
    const updates = []

    // Check and fix each daily
    for (const daily of dailys || []) {
      const calculatedDuration = calculateDurationMinutes(daily.start_time, daily.end_time)

      // Log for debugging
      console.log(`Daily ${daily.id}: ${daily.start_time} -> ${daily.end_time}`)
      console.log(`  Stored: ${daily.duration_minutes}min, Calculated: ${calculatedDuration}min`)

      // Always update if there's any difference
      if (calculatedDuration !== daily.duration_minutes && calculatedDuration > 0) {
        const { error: updateError } = await admin
          .from('dailys')
          .update({ duration_minutes: calculatedDuration })
          .eq('id', daily.id)

        if (!updateError) {
          fixedCount++
          updates.push({
            id: daily.id,
            old: daily.duration_minutes,
            new: calculatedDuration,
            start: daily.start_time,
            end: daily.end_time
          })
        }
      }
    }

    return NextResponse.json({
      message: `Correção concluída. ${fixedCount} dailys corrigidas.`,
      fixed: fixedCount,
      total: dailys?.length || 0,
      updates
    })

  } catch (error) {
    console.error('Error fixing daily durations:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}