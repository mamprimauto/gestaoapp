import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 })
  }

  // Usar service key se disponível para ter acesso total
  const supabase = createClient(url, serviceKey || anonKey)

  try {
    // Listar pastas no bucket (root level)
    const { data: folders, error: listError } = await supabase.storage
      .from('task-files')
      .list('', {
        limit: 5,
        offset: 0
      })
    
    // Para cada pasta, listar arquivos dentro dela
    let allFiles: any[] = []
    
    if (folders && folders.length > 0) {
      for (const folder of folders.slice(0, 3)) { // Limitar a 3 pastas para teste
        const { data: filesInFolder } = await supabase.storage
          .from('task-files')
          .list(folder.name, {
            limit: 5,
            offset: 0
          })
        
        if (filesInFolder) {
          filesInFolder.forEach(file => {
            allFiles.push({
              folder: folder.name,
              file: file.name,
              fullPath: `${folder.name}/${file.name}`,
              size: file.metadata?.size || 0,
              created: file.created_at
            })
          })
        }
      }
    }
    
    const { data: files } = await supabase.storage
      .from('task-files')
      .list('60d7c02e-ea06-4268-9e01-134fe2d14548', {
        limit: 10,
        offset: 0
      })

    if (listError) {
      return NextResponse.json({ 
        error: "Failed to list files",
        details: listError 
      }, { status: 500 })
    }

    // Para cada arquivo na pasta específica, gerar URL pública
    const filesWithUrls = files?.map(file => {
      const fullPath = `60d7c02e-ea06-4268-9e01-134fe2d14548/${file.name}`
      const { data } = supabase.storage
        .from('task-files')
        .getPublicUrl(fullPath)
      
      return {
        name: file.name,
        fullPath: fullPath,
        size: file.metadata?.size || 0,
        created: file.created_at,
        publicUrl: data.publicUrl,
        directUrl: `${url}/storage/v1/object/public/task-files/${fullPath}`
      }
    }) || []

    // Verificar configuração do bucket
    const bucketInfo = {
      bucketId: 'task-files',
      baseUrl: url,
      storageUrl: `${url}/storage/v1`,
      publicPath: `${url}/storage/v1/object/public/task-files/`
    }

    return NextResponse.json({
      success: true,
      bucket: bucketInfo,
      folders: folders?.map(f => f.name),
      filesInFolders: allFiles,
      specificFolder: '60d7c02e-ea06-4268-9e01-134fe2d14548',
      filesInSpecificFolder: filesWithUrls,
      totalFilesInSpecificFolder: files?.length || 0,
      testUrls: filesWithUrls.slice(0, 3).map(f => f.publicUrl)
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Storage test failed",
      message: error.message 
    }, { status: 500 })
  }
}