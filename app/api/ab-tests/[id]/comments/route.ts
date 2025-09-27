import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  const testId = params.id

  try {
    // Verificar se o teste A/B existe
    const { data: abTest, error: testErr } = await admin
      .from("ab_tests")
      .select("id")
      .eq("id", testId)
      .maybeSingle()

    if (testErr) return NextResponse.json({ error: testErr.message }, { status: 500 })
    if (!abTest) return NextResponse.json({ error: "A/B Test not found" }, { status: 404 })

    // Sistema colaborativo - todos autenticados podem ver comentários
    // (sem restrições de organização como solicitado)

    // Buscar comentários com informações do usuário
    const { data: comments, error: commentsErr } = await admin
      .from("ab_test_comments")
      .select(`
        id,
        content,
        image_url,
        created_at,
        updated_at,
        user:profiles!user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq("ab_test_id", testId)
      .order("created_at", { ascending: true })

    if (commentsErr) return NextResponse.json({ error: commentsErr.message }, { status: 500 })

    return NextResponse.json({ comments: comments || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  const testId = params.id

  try {
    const body = await req.json()
    const { content, image_url } = body

    if ((!content || typeof content !== "string" || content.trim().length === 0) && !image_url) {
      return NextResponse.json({ error: "Content or image is required" }, { status: 400 })
    }

    // Validar image_url se fornecida
    if (image_url && (typeof image_url !== "string" || !image_url.trim())) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
    }

    // Verificar se o teste A/B existe
    const { data: abTest, error: testErr } = await admin
      .from("ab_tests")
      .select("id")
      .eq("id", testId)
      .maybeSingle()

    if (testErr) return NextResponse.json({ error: testErr.message }, { status: 500 })
    if (!abTest) return NextResponse.json({ error: "A/B Test not found" }, { status: 404 })

    // Sistema colaborativo - todos autenticados podem comentar

    // Criar comentário
    const commentData = {
      ab_test_id: parseInt(testId),
      user_id: userData.user.id,
      content: content?.trim() || "",
      ...(image_url && { image_url: image_url.trim() })
    }

    const { data: comment, error: commentErr } = await admin
      .from("ab_test_comments")
      .insert(commentData)
      .select(`
        id,
        content,
        image_url,
        created_at,
        updated_at,
        user:profiles!user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single()

    if (commentErr) return NextResponse.json({ error: commentErr.message }, { status: 500 })

    return NextResponse.json({ comment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}