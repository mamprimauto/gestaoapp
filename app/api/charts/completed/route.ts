// Cache/ISR for chart data
export const revalidate = 300

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function toUTCKey(d: Date) {
  const y = d.getUTCFullYear()
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0")
  const day = `${d.getUTCDate()}`.padStart(2, "0")
  return `${y}-${m}-${day}`
}

function brDayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

// GET /api/charts/completed?days=7
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Math.max(2, Math.min(60, Number(searchParams.get("days")) || 7))

    // Build day series (oldest -> today), normalized to UTC midnight
    const now = new Date()
    const series: { key: string; label: string; date: Date }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      d.setUTCDate(d.getUTCDate() - i)
      series.push({ key: toUTCKey(d), label: brDayLabel(d), date: d })
    }
    const start = new Date(series[0].date)

    // Get authentication token from header
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const user = userData.user
    
    // Buscar tasks individuais do usuário (either assigned to them or created by them)
    const { data, error } = await admin
      .from("tasks")
      .select("id, status, updated_at, assignee_id, user_id")
      .gte("updated_at", start.toISOString())
      .eq("status", "done")
      .or(`assignee_id.eq.${user.id},user_id.eq.${user.id}`)

    if (error) throw error

    const counts: Record<string, number> = {}
    for (const s of series) counts[s.key] = 0
    for (const t of data || []) {
      // Only count tasks that are assigned to the user or created by them
      if (t.assignee_id === user.id || t.user_id === user.id) {
        const d = new Date(t.updated_at as string)
        const k = toUTCKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())))
        if (k in counts) counts[k] += 1
      }
    }

    const values = series.map((s) => ({ key: s.key, label: s.label, value: counts[s.key] ?? 0 }))
    const max = Math.max(1, ...values.map((v) => v.value))
    const total = values.reduce((a, b) => a + b.value, 0)

    // Cache for 1 min (shorter cache for individual data)
    return NextResponse.json(
      { values, max, total, days },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } },
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falha ao gerar série" }, { status: 500 })
  }
}
