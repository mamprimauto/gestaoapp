import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL as string
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!url || !serviceRole) {
      return NextResponse.json({ error: "Supabase envs missing" }, { status: 500 })
    }
    const supabase = createClient(url, serviceRole, { auth: { persistSession: false }, global: { fetch } })

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const members = (data || []).map((r: any) => ({
      id: r.id as string,
      name: (r.name as string) ?? null,
      email: (r.email as string) ?? null,
      avatar_url: (r.avatar_url as string) ?? null,
    }))

    return NextResponse.json(members, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
