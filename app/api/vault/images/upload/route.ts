import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB limit for vault images
const BUCKET = "vault-images"

export async function POST(req: Request) {
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

  // Resolve usuário autenticado
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
  const uid = userData.user.id

  // Parse FormData
  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  // Validar que é uma imagem
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Apenas imagens são permitidas no vault" }, { status: 400 })
  }

  // Validar tamanho
  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ 
      error: "Imagem muito grande. Máximo 5MB permitido."
    }, { status: 400 })
  }

  // Garantir que o bucket existe
  {
    const { data: existing } = await admin.storage.getBucket(BUCKET)
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "5MB",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"]
      })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
  }

  // Gerar caminho único
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
  const safeBase = file.name.replace(/[^\w.\-\s()[\]]+/g, "_").slice(0, 140)
  const randomId = Date.now().toString() + '-' + Math.random().toString(36).substring(7)
  const path = `${uid}/${randomId}.${ext}`

  // Upload do arquivo
  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Obter URL pública
  const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json(
    {
      success: true,
      path,
      publicUrl: publicUrlData.publicUrl,
      fileName: safeBase || `imagem.${ext}`,
      size: file.size,
      contentType: file.type
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  )
}