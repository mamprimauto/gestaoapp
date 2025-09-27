import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const BUCKET = "task-files"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !service) {
    return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
  }
  
  // Auth
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const admin = createClient(url, service, { 
    auth: { 
      persistSession: false, 
      autoRefreshToken: false 
    } 
  })
  
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
  
  const uid = userData.user.id
  const taskId = params.id
  
  // Body
  let body: { 
    fileName?: string
    size?: number
    contentType?: string 
  } = {}
  
  try {
    body = await req.json()
  } catch {
    // ignore (optional body)
  }
  
  const fileName = String(body.fileName || "arquivo.bin")
  const size = Number(body.size || 0)
  const contentType = typeof body.contentType === "string" ? body.contentType : "application/octet-stream"
  
  // Size validation
  if (size > MAX_SIZE) {
    return NextResponse.json({ 
      error: `Arquivo muito grande. Máximo 100MB permitido.`
    }, { status: 400 })
  }
  
  // Permission check: verify user can access this OKR task
  {
    const { data: task, error: taskErr } = await admin
      .from("okr_tasks")
      .select("id")
      .eq("id", taskId)
      .maybeSingle()
    
    if (taskErr) {
      return NextResponse.json({ error: taskErr.message }, { status: 500 })
    }
    
    if (!task) {
      return NextResponse.json({ error: "OKR task not found" }, { status: 404 })
    }
  }
  
  // Ensure bucket exists and is public
  {
    const { data: existing } = await admin.storage.getBucket(BUCKET)
    
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "2GB",
      })
      
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
    } else {
      const { error: updErr } = await admin.storage.updateBucket(BUCKET, {
        public: true,
        fileSizeLimit: "2GB",
      })
      
      if (updErr) {
        // best-effort, don't fail
      }
    }
  }
  
  // Generate safe path for OKR task comments
  const ext = (fileName.split(".").pop() || "bin").toLowerCase()
  const safeBase = fileName.replace(/[^\w.\-\s()[\]]+/g, "_").slice(0, 140)
  const path = `okr-tasks/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  
  // Create signed URL for upload
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  
  if (error || !data) {
    return NextResponse.json({ 
      error: error?.message || "Falha ao criar URL assinada" 
    }, { status: 500 })
  }
  
  return NextResponse.json(
    {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      fileName: safeBase || `arquivo.${ext}`,
      contentType,
    },
    { headers: { "cache-control": "no-store" } },
  )
}