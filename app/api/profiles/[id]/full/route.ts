import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      )
    }
    
    // Usar service role key para contornar RLS e pegar todos os dados
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    
    // Buscar perfil completo usando admin client
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .single()
    
    if (error) {

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }
    
    // Retornar todos os dados do perfil
    return NextResponse.json(data)
    
  } catch (error: any) {

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}