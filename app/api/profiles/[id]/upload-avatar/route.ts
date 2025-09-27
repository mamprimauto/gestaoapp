import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      )
    }
    
    // Usar service role key para contornar RLS
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    
    // Pegar o arquivo do FormData
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }
    
    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${params.id}-${Date.now()}.${fileExt}`
    
    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload usando admin client (sem RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {

      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }
    
    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    // Atualizar o perfil com a nova URL do avatar
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", params.id)
      .select()
      .single()
    
    if (error) {

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      data,
      avatar_url: publicUrl 
    })
    
  } catch (error: any) {

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}