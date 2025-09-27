import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  const uid = userData.user.id

  type Body = { taskId: string; path: string; fileName: string; size: number; contentType?: string | null; fileCategory?: string | null }
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { taskId, path, fileName, size, contentType, fileCategory } = body || ({} as Body)
  if (!taskId || !path || !fileName || typeof size !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Checa se o path pertence à task
  if (!path.startsWith(`${taskId}/`)) {
    return NextResponse.json({ error: "Invalid path for task" }, { status: 400 })
  }

  // Verificar se a task existe (sistema interno - qualquer usuário autenticado pode adicionar arquivos)
  {
    const { data: t, error: terr } = await admin
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .maybeSingle()
    if (terr) return NextResponse.json({ error: terr.message }, { status: 500 })
    if (!t) return NextResponse.json({ error: "Task not found" }, { status: 404 })
    // Sistema interno - qualquer usuário autenticado pode adicionar arquivos
  }

  // Registra metadados com file_category
  const { data: inserted, error: insErr } = await admin
    .from("task_files")
    .insert({
      task_id: taskId,
      file_name: fileName,
      path,
      size,
      content_type: contentType || null,
      file_category: fileCategory || 'general',
      uploaded_by: uid,
    })
    .select("*")
    .single()

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json(inserted, { headers: { "cache-control": "no-store" } })
}
