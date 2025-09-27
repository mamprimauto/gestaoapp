import { NextResponse } from "next/server"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""

  if (!url || !anon) {
    return NextResponse.json(
      { error: "Supabase public env not set on server" },
      { status: 500, headers: { "cache-control": "no-store" } }
    )
  }

  return NextResponse.json(
    { url, anon },
    { headers: { "cache-control": "no-store" } }
  )
}
