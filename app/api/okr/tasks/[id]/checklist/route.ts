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

    // Buscar checklist da tarefa OKR
    const { data: checklist, error: checklistError } = await admin
      .from("okr_task_checklist")
      .select("*")
      .eq("okr_task_id", okrTaskId)
      .order("position", { ascending: true })

    if (checklistError) {
      return NextResponse.json({ error: "Erro ao buscar checklist" }, { status: 500 })
    }

    return NextResponse.json({
      checklist: checklist || []
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
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
    const { content, position = 0 } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 })
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

    // Criar item da checklist
    const { data: newItem, error: insertError } = await admin
      .from("okr_task_checklist")
      .insert({
        okr_task_id: okrTaskId,
        user_id: userData.user.id,
        content: content.trim(),
        position: position,
        completed: false
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: "Erro ao criar item da checklist" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      item: newItem,
      message: "Item da checklist criado"
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const body = await req.json()
    const { itemId, content, completed, position } = body

    if (!itemId) {
      return NextResponse.json({ error: "Item ID é obrigatório" }, { status: 400 })
    }

    // Preparar updates
    const updates: any = {}
    if (content !== undefined) updates.content = content
    if (completed !== undefined) updates.completed = completed
    if (position !== undefined) updates.position = position

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    // Atualizar item da checklist
    const { data: updatedItem, error: updateError } = await admin
      .from("okr_task_checklist")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: "Erro ao atualizar item da checklist" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      item: updatedItem,
      message: "Item da checklist atualizado"
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const searchParams = req.nextUrl.searchParams
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: "Item ID é obrigatório" }, { status: 400 })
    }

    // Deletar item da checklist
    const { error: deleteError } = await admin
      .from("okr_task_checklist")
      .delete()
      .eq("id", itemId)

    if (deleteError) {
      return NextResponse.json({ error: "Erro ao deletar item da checklist" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Item da checklist removido"
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    )
  }
}