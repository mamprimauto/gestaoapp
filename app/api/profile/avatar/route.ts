import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Configurar tamanho máximo do body
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    )
  }

  // Recupera o token do usuário (Bearer <jwt>)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : ""

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 })
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  // Resolve usuário a partir do token
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
  const uid = userData.user.id

  // Lê arquivo do form-data
  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  // Garante bucket 'avatars' (idempotente)
  const { data: existing } = await admin.storage.getBucket("avatars")
  if (!existing) {
    const { error: createErr } = await admin.storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: "5MB",
    })
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
  }

  // Faz upload usando Service Role (não sofre RLS)
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
  const path = `${uid}/${Date.now()}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: true,
    })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  // URL pública
  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) {
    return NextResponse.json({ error: "Failed to get public URL" }, { status: 500 })
  }

  // Atualiza o perfil do usuário com avatar_url
  const { error: updErr } = await admin
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", uid)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url: publicUrl }, { headers: { "cache-control": "no-store" } })
}
