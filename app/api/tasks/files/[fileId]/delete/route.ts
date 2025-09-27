import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(req: Request, { params }: { params: { fileId: string } }) {
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

  const fileId = params.fileId
  const { data: tf, error: tfErr } = await admin
    .from("task_files")
    .select("id, path, task_id")
    .eq("id", fileId)
    .maybeSingle()
  if (tfErr) return NextResponse.json({ error: tfErr.message }, { status: 500 })
  if (!tf) return NextResponse.json({ error: "File not found" }, { status: 404 })

  // Verificar se a task existe (sistema interno - qualquer usuário autenticado pode deletar arquivos)
  const { data: task, error: terr } = await admin
    .from("tasks")
    .select("id")
    .eq("id", (tf as any).task_id)
    .maybeSingle()
  if (terr) return NextResponse.json({ error: terr.message }, { status: 500 })
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })
  // Sistema interno - qualquer usuário autenticado pode deletar arquivos

  // Remove objeto e metadados
  const { error: remErr } = await admin.storage.from("task-files").remove([(tf as any).path])
  if (remErr) return NextResponse.json({ error: remErr.message }, { status: 500 })

  const { error: delErr } = await admin.from("task_files").delete().eq("id", fileId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } })
}
