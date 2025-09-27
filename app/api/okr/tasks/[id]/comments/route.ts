import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const okrTaskId = params.id
    if (!okrTaskId) {
      return NextResponse.json({ error: "OKR Task ID é obrigatório" }, { status: 400 })
    }

    // Verificar se a tarefa OKR existe e o usuário tem permissão
    const { data: okrTask, error: taskError } = await admin
      .from("okr_tasks")
      .select(`
        id,
        title,
        assignee_id,
        key_result_id,
        key_results!inner (
          id,
          okr_id,
          okrs!inner (
            id,
            created_by
          )
        )
      `)
      .eq("id", okrTaskId)
      .single()

    if (taskError || !okrTask) {
      return NextResponse.json({ error: "Tarefa OKR não encontrada" }, { status: 404 })
    }

    // Verificar permissão: criador do OKR ou assignee da tarefa
    const hasPermission = okrTask.key_results.okrs.created_by === userData.user.id || 
                         okrTask.assignee_id === userData.user.id

    if (!hasPermission) {
      return NextResponse.json({ error: "Sem permissão para esta tarefa OKR" }, { status: 403 })
    }

    // Buscar comentários da tarefa OKR com dados do usuário

    // Buscar comentários usando query SQL direta para evitar problemas de schema cache
    const { data: comments, error: commentsError } = await admin
      .rpc('get_okr_task_comments', { task_id: okrTaskId })
    
    // Fallback: se a função não existir, usar query simples sem profiles
    if (commentsError && commentsError.message?.includes('function')) {

      const { data: simpleComments, error: fallbackError } = await admin
        .from("okr_task_comments")
        .select(`
          id,
          content,
          image_url,
          created_at,
          updated_at,
          user_id
        `)
        .eq("okr_task_id", okrTaskId)
        .order("created_at", { ascending: true })
      
      if (fallbackError) {

        return NextResponse.json({ error: `Erro ao buscar comentários: ${fallbackError.message}` }, { status: 500 })
      }
      
      // Buscar profiles separadamente
      const userIds = [...new Set(simpleComments?.map(c => c.user_id) || [])]
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds)
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
      
      const commentsWithProfiles = simpleComments?.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null
      }))
      
      return NextResponse.json({
        comments: commentsWithProfiles?.map(comment => ({
          id: comment.id,
          content: comment.content,
          image_url: comment.image_url,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          user: {
            id: comment.user_id,
            name: comment.profiles?.name || "Usuário",
            email: comment.profiles?.email || "user@example.com",
            avatar_url: comment.profiles?.avatar_url || null
          }
        })) || []
      })
    }

    if (commentsError) {

      return NextResponse.json({ error: `Erro ao buscar comentários: ${commentsError.message}` }, { status: 500 })
    }

    // Formatar comentários para compatibilidade com TaskComments
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      content: comment.content,
      image_url: comment.image_url,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: {
        id: comment.user_id,
        name: comment.profiles?.name || "Usuário",
        email: comment.profiles?.email || "user@example.com",
        avatar_url: comment.profiles?.avatar_url || null
      }
    }))

    return NextResponse.json({
      comments: formattedComments
    })

  } catch (error: any) {

    return NextResponse.json(
      { error: `Erro interno do servidor: ${error.message}` }, 
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = process.env.SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const okrTaskId = params.id
    const body = await req.json()
    const { content, image_url } = body

    // Validar que pelo menos conteúdo ou imagem foi fornecido
    if (!content?.trim() && !image_url) {
      return NextResponse.json({ error: "Conteúdo ou imagem é obrigatório" }, { status: 400 })
    }

    // Verificar se a tarefa OKR existe e o usuário tem permissão
    const { data: okrTask, error: taskError } = await admin
      .from("okr_tasks")
      .select(`
        id,
        title,
        assignee_id,
        key_result_id,
        key_results!inner (
          id,
          okr_id,
          okrs!inner (
            id,
            created_by
          )
        )
      `)
      .eq("id", okrTaskId)
      .single()

    if (taskError || !okrTask) {
      return NextResponse.json({ error: "Tarefa OKR não encontrada" }, { status: 404 })
    }

    // Verificar permissão: criador do OKR ou assignee da tarefa
    const hasPermission = okrTask.key_results.okrs.created_by === userData.user.id || 
                         okrTask.assignee_id === userData.user.id

    if (!hasPermission) {
      return NextResponse.json({ error: "Sem permissão para esta tarefa OKR" }, { status: 403 })
    }

    // Criar comentário

    const { data: newComment, error: insertError } = await admin
      .from("okr_task_comments")
      .insert({
        okr_task_id: okrTaskId,
        user_id: userData.user.id,
        content: content?.trim() || null,
        image_url: image_url || null
      })
      .select(`
        id,
        content,
        image_url,
        created_at,
        updated_at,
        user_id
      `)
      .single()

    if (insertError) {

      return NextResponse.json({ error: `Erro ao criar comentário: ${insertError.message}` }, { status: 500 })
    }

    // Buscar dados do usuário separadamente
    const { data: userProfile } = await admin
      .from("profiles")
      .select("id, name, email, avatar_url")
      .eq("id", userData.user.id)
      .single()

    // Formatar comentário para compatibilidade com TaskComments
    const formattedComment = {
      id: newComment.id,
      content: newComment.content,
      image_url: newComment.image_url,
      created_at: newComment.created_at,
      updated_at: newComment.updated_at,
      user: {
        id: newComment.user_id,
        name: userProfile?.name || "Usuário",
        email: userProfile?.email || "user@example.com",
        avatar_url: userProfile?.avatar_url || null
      }
    }

    return NextResponse.json({ 
      success: true,
      comment: formattedComment,
      message: "Comentário criado"
    })

  } catch (error: any) {

    return NextResponse.json(
      { error: `Erro interno do servidor: ${error.message}` }, 
      { status: 500 }
    )
  }
}