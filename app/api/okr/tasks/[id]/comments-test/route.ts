import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const okrTaskId = params.id

    // Teste 1: Verificar se a tabela existe
    try {
      const { count, error: countError } = await admin
        .from("okr_task_comments")
        .select("*", { count: "exact", head: true })
      
      if (countError) {

        return NextResponse.json({ 
          error: `Tabela não existe ou erro de permissão: ${countError.message}`,
          details: countError
        }, { status: 500 })
      }

    } catch (err: any) {

      return NextResponse.json({ 
        error: `Erro geral: ${err.message}` 
      }, { status: 500 })
    }

    // Teste 2: Buscar comentários simples
    try {
      const { data: comments, error: commentsError } = await admin
        .from("okr_task_comments")
        .select("id, content, created_at")
        .eq("okr_task_id", okrTaskId)
        .limit(10)

      if (commentsError) {

        return NextResponse.json({ 
          error: `Erro na query: ${commentsError.message}`,
          code: commentsError.code,
          details: commentsError.details 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        comments: comments || [],
        message: "Teste OK"
      })

    } catch (err: any) {

      return NextResponse.json({ 
        error: `Erro na query: ${err.message}` 
      }, { status: 500 })
    }

  } catch (error: any) {

    return NextResponse.json(
      { error: `Erro geral: ${error.message}` }, 
      { status: 500 }
    )
  }
}