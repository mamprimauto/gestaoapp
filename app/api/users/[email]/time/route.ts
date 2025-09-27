import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request, { params }: { params: { email: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const userEmail = decodeURIComponent(params.email)
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: "Date parameter is required (YYYY-MM-DD)" }, { status: 400 })
    }

    // Buscar o usuário pelo email
    const { data: user, error: userError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .single()


    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calcular o início e fim do dia no fuso horário de Brasília
    const startOfDay = `${date}T00:00:00-03:00`
    const endOfDay = `${date}T23:59:59-03:00`

    // Buscar todas as sessões de timer do usuário nesse dia
    const { data: sessions, error: sessionsError } = await admin
      .from("task_time_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay)
      .order("start_time", { ascending: false })

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }


    return NextResponse.json({ sessions: sessions || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}