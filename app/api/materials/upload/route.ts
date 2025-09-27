import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })
    }

  // Autenticação obrigatória - igual ao sistema de tasks
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  // Verificar token e obter usuário
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
  const uid = userData.user.id

  // Parse FormData
  const form = await req.formData()
  const file = form.get("file")
  const productId = form.get("productId")
  const title = form.get("title")
  const description = form.get("description")
  const category = form.get("category")
  const tags = form.get("tags")

  // Verificar se file existe e é válido
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  // Em produção, file pode ser um Blob ao invés de File
  const isValidFile = file && typeof file === 'object' && 'stream' in file

  if (!productId || typeof productId !== "string") {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 })
  }

  // Validações de arquivo
  const MAX_SIZE = 200 * 1024 * 1024 // 200MB - maior que antes para vídeos

  // Garantir que file é tratado como Blob
  const fileBlob = file as Blob

  if (fileBlob.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo excede 200MB" }, { status: 413 })
  }

  // Tipos permitidos
  const ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'
  ]
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime'
  ]
  const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf', 'text/html'
  ]
  const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES]

  // Se o tipo não for reconhecido, permitir como genérico
  const fileType = fileBlob.type || 'application/octet-stream'
  const isAllowedType = ALLOWED_TYPES.includes(fileType) || fileType === 'application/octet-stream'

  if (!isAllowedType && fileType !== 'application/octet-stream') {
    return NextResponse.json({
      error: "Tipo de arquivo não suportado. Use imagens, vídeos, PDFs ou HTML."
    }, { status: 400 })
  }

  // Usar o bucket task-files existente (já funciona em produção)
  const BUCKET = "task-files"

  // Garantir que o bucket existe
  {
    const { data: existing } = await admin.storage.getBucket(BUCKET)
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 209715200, // 200MB em bytes
        allowedMimeTypes: undefined // Permitir todos os tipos
      })
      if (createErr) {
        console.error("Erro ao criar bucket:", createErr)
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
    }
  }

  // Gerar caminho único - usar padrão similar ao de tasks
  // Em produção, file pode não ter a propriedade name
  const fileName = (file as any).name || `upload_${Date.now()}`
  const ext = (fileName.split(".").pop() || "bin").toLowerCase()
  const safeName = fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)

  // Path com estrutura: materials/productId/timestamp-random.ext
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).slice(2)
  const path = `materials/${productId}/${timestamp}-${randomId}.${ext}`

  // Upload do arquivo
  const buffer = await fileBlob.arrayBuffer()
  const { error: uploadError, data: uploadData } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: fileType,
      upsert: false,
      cacheControl: "3600",
    })

  if (uploadError) {
    console.error("Erro no upload:", uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Gerar URL pública temporária para o arquivo
  const { data: { signedUrl }, error: urlError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 365 * 24 * 60 * 60) // 1 ano

  if (urlError) {
    console.error("Erro ao gerar URL:", urlError)
    // Tentar deletar o arquivo que foi uploaded
    await admin.storage.from(BUCKET).remove([path]).catch(() => {})
    return NextResponse.json({ error: "Erro ao gerar URL do arquivo" }, { status: 500 })
  }

  // Preparar dados para salvar no banco
  const materialData: any = {
    product_id: productId,
    title: (title as string) || safeName || `material.${ext}`,
    description: (description as string) || "",
    file_url: signedUrl, // Usar signed URL ao invés de public URL
    file_type: fileType,
    file_size: fileBlob.size,
    thumbnail_url: ALLOWED_IMAGE_TYPES.includes(fileType) ? signedUrl : null,
    category: (category as string) || "outros",
    tags: tags ? (tags as string).split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
  }

  // Adicionar colunas opcionais se existirem no banco
  // Isso mantém compatibilidade com produção
  try {
    // Verificar se as colunas existem
    const { data: testData } = await admin
      .from('product_materials')
      .select('*')
      .limit(1)

    if (testData && testData.length > 0) {
      const sampleRow = testData[0]
      if ('file_path' in sampleRow) {
        materialData.file_path = path
      }
      if ('created_by' in sampleRow) {
        materialData.created_by = uid
      }
    }
  } catch {
    // Ignorar erro de verificação
  }

  // Salvar no banco de dados
  try {
    const { data, error } = await admin
      .from('product_materials')
      .insert([materialData])
      .select()
      .single()

    if (error) {
      console.error("Erro ao salvar no banco:", error)
      // Se falhou no banco, remover arquivo do storage
      await admin.storage.from(BUCKET).remove([path]).catch(() => {})
      throw new Error(error.message)
    }

    return NextResponse.json(
      {
        success: true,
        material: data,
        path,
        signedUrl
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    )
  } catch (error: any) {
    console.error("Erro na API de upload de materiais:", error)
    return NextResponse.json({
      error: error.message || "Erro ao salvar no banco de dados"
    }, { status: 500 })
  }
  } catch (globalError: any) {
    console.error("Erro geral na API de upload:", globalError)
    return NextResponse.json({
      error: globalError.message || "Erro interno no servidor",
      details: process.env.NODE_ENV === 'development' ? globalError.stack : undefined
    }, { status: 500 })
  }
}