import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const MAX_DEFAULT = 1024 * 1024 * 1024 // 1GB
const MAX_AVATAR = 100 * 1024 * 1024 // 100MB
const MAX_INSPIRATION = 900 * 1024 * 1024 // 900MB
const MAX_ENTREGAVEL = 2 * 1024 * 1024 * 1024 // 2GB
const BUCKET = "task-files" // Usar o mesmo bucket de tasks

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
  }
  
  // Sistema interno - não precisa autenticação
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  // Usar ID fixo para sistema interno
  const uid = "00000000-0000-0000-0000-000000000000"
  const swipeFileId = params.id
  
  // Body
  let body: { fileName?: string; size?: number; contentType?: string; fileType?: "avatar" | "inspiration" | "entregavel" | "default" } = {}
  try {
    body = await req.json()
  } catch {
    // ignore (optional body)
  }
  
  const fileName = String(body.fileName || "arquivo.bin")
  const size = Number(body.size || 0)
  const contentType = typeof body.contentType === "string" ? body.contentType : "application/octet-stream"
  const fileType = body.fileType || "default"
  
  // Validação de tamanho baseada no tipo
  let maxSize = MAX_DEFAULT
  let sizeLabel = "1GB"
  if (fileType === "avatar") {
    maxSize = MAX_AVATAR
    sizeLabel = "100MB"
  } else if (fileType === "inspiration") {
    maxSize = MAX_INSPIRATION
    sizeLabel = "900MB"
  } else if (fileType === "entregavel") {
    maxSize = MAX_ENTREGAVEL
    sizeLabel = "2GB"
  }
  
  if (size > maxSize) {
    return NextResponse.json({ 
      error: `Arquivo muito grande. Máximo ${sizeLabel} permitido para ${fileType}.`
    }, { status: 400 })
  }
  
  // Validação específica para avatar (deve ser imagem)
  if (fileType === "avatar" && !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Avatar deve ser uma imagem" }, { status: 400 })
  }
  
  // Verificar apenas se o swipe file existe (sistema interno)
  {
    const { data: sf, error: sferr } = await admin
      .from("swipe_files")
      .select("id")
      .eq("id", swipeFileId)
      .maybeSingle()
    if (sferr) return NextResponse.json({ error: sferr.message }, { status: 500 })
    if (!sf) return NextResponse.json({ error: "Swipe file not found" }, { status: 404 })
  }
  
  // Bucket: garante existência, público e limite 2GB
  {
    const { data: existing } = await admin.storage.getBucket(BUCKET)
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: true, // IMPORTANTE: bucket precisa ser público para URLs funcionarem
        fileSizeLimit: "2GB", // Aumentado para suportar entregáveis
      })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    } else {
      const { error: updErr } = await admin.storage.updateBucket(BUCKET, {
        public: true, // IMPORTANTE: atualiza bucket existente para público
        fileSizeLimit: "2GB", // Aumentado para suportar entregáveis
      })
      if (updErr) {
        // best-effort, não falha
      }
    }
  }
  
  // Gera caminho seguro - usar swipe-files prefix para organização
  const ext = (fileName.split(".").pop() || "bin").toLowerCase()
  const safeBase = fileName.replace(/[^\w.\-\s()[\]]+/g, "_").slice(0, 140)
  const path = `swipe-files/${swipeFileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  
  // URL assinada para upload direto
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Falha ao criar URL assinada" }, { status: 500 })
  }
  
  return NextResponse.json(
    {
      path,
      token: data.token,
      signedUrl: data.signedUrl, // Adiciona a URL assinada completa
      // opcional: ecoar metadados para o cliente
      fileName: safeBase || `arquivo.${ext}`,
      contentType,
    },
    { headers: { "cache-control": "no-store" } },
  )
}