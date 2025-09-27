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

  // Parse body
  let body: { fileName?: string; size?: number; contentType?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const fileName = String(body.fileName || "imagem.jpg")
  const size = Number(body.size || 0)
  const contentType = typeof body.contentType === "string" ? body.contentType : "image/jpeg"

  // Validar que é uma imagem
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Apenas imagens são permitidas no vault" }, { status: 400 })
  }

  // Validar tamanho
  if (size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ 
      error: "Imagem muito grande. Máximo 5MB permitido."
    }, { status: 400 })
  }

  // Garantir que o bucket existe e é público
  {
    const { data: existing } = await admin.storage.getBucket(BUCKET)
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "5MB",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"]
      })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    } else {
      const { error: updErr } = await admin.storage.updateBucket(BUCKET, {
        public: true,
        fileSizeLimit: "5MB"
      })
      // best-effort, não falha se update der erro
    }
  }

  // Gerar caminho único organizado por usuário
  const ext = (fileName.split(".").pop() || "jpg").toLowerCase()
  const safeBase = fileName.replace(/[^\w.\-\s()[\]]+/g, "_").slice(0, 140)
  const randomId = Date.now().toString() + '-' + Math.random().toString(36).substring(7)
  const path = `${uid}/${randomId}.${ext}`

  // Criar URL assinada para upload
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Falha ao criar URL assinada" }, { status: 500 })
  }

  return NextResponse.json(
    {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      fileName: safeBase || `imagem.${ext}`,
      contentType,
    },
    { headers: { "cache-control": "no-store" } }
  )
}