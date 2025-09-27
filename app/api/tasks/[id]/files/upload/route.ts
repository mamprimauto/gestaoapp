import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  // Resolve usuário
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
  const uid = userData.user.id

  // Verificar se a task existe (sistema interno - qualquer usuário autenticado pode adicionar arquivos)
  const taskId = params.id
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

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  // Validações simples
  const MAX = 1024 * 1024 * 1024 // 1GB
  if (file.size > MAX) {
    return NextResponse.json({ error: "Arquivo excede 1GB" }, { status: 413 })
  }

  // Garante bucket
  {
    const { data: existing } = await admin.storage.getBucket("task-files")
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket("task-files", { public: false })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase()
  // Preserva mais caracteres do nome original, removendo apenas caracteres problemáticos
  const safeName = file.name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") // Remove apenas caracteres problemáticos do sistema de arquivos
    .replace(/\s+/g, " ") // Normaliza espaços múltiplos para um único espaço
    .trim()
    .slice(0, 180)
  const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: upErr } = await admin.storage.from("task-files").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
    cacheControl: "3600",
  })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  // Salva metadados
  const { data: inserted, error: insErr } = await admin
    .from("task_files")
    .insert({
      task_id: taskId,
      file_name: safeName || `arquivo.${ext}`,
      path,
      size: file.size,
      content_type: file.type || null,
      uploaded_by: uid,
    })
    .select("*")
    .single()

  if (insErr) {
    // rollback tentativa (best-effort)
    await admin.storage
      .from("task-files")
      .remove([path])
      .catch(() => {})
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json(inserted, { status: 200, headers: { "cache-control": "no-store" } })
}
