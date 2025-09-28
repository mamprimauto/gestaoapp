// 🔐 API para Gerenciamento de Permissões do Vault
// Endpoints para consultar e gerenciar permissões de usuários

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UserPermissions, UserDepartment, UserAccessLevel } from '@/lib/vault/types'

// Força modo dinâmico para evitar erro de renderização estática
export const dynamic = 'force-dynamic'

// Criar cliente Supabase com service role para operações do servidor
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Helper para autenticação
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Token de autorização necessário' }
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  try {
    const supabase = getSupabaseAdmin()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { user: null, error: 'Token inválido ou expirado' }
    }
    
    return { user, error: null }
  } catch (error) {

    return { user: null, error: 'Erro na autenticação' }
  }
}

// ===== GET - OBTER PERMISSÕES DO USUÁRIO =====
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError || 'Não autorizado' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 2. Buscar permissões do usuário
    const { data: permissions, error: fetchError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned

      return NextResponse.json(
        { success: false, error: 'Erro ao carregar permissões' },
        { status: 500 }
      )
    }

    // 3. Se não encontrou permissões, criar padrão
    if (!permissions) {
      const { data: newPermissions, error: createError } = await supabase
        .from('user_permissions')
        .insert({
          user_id: user.id,
          department: 'particular' as UserDepartment,
          access_level: 'user' as UserAccessLevel,
          additional_departments: [],
          can_create_shared: false,
          can_access_cross_department: false
        })
        .select()
        .single()

      if (createError) {

        return NextResponse.json(
          { success: false, error: 'Erro ao criar permissões padrão' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: newPermissions as UserPermissions
      })
    }

    // 4. Resposta com permissões existentes
    return NextResponse.json({
      success: true,
      data: permissions as UserPermissions
    })

  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ===== PUT - ATUALIZAR PERMISSÕES (APENAS ADMINS) =====
export async function PUT(request: NextRequest) {
  try {
    // 1. Autenticação
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError || 'Não autorizado' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 2. Verificar se é admin
    const { data: userPermissions, error: permError } = await supabase
      .from('user_permissions')
      .select('access_level')
      .eq('user_id', user.id)
      .single()

    if (permError || userPermissions?.access_level !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem alterar permissões' },
        { status: 403 }
      )
    }

    // 3. Validar body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição inválido' },
        { status: 400 }
      )
    }

    const { target_user_id, ...updateData } = body

    if (!target_user_id) {
      return NextResponse.json(
        { success: false, error: 'target_user_id é obrigatório' },
        { status: 400 }
      )
    }

    // 4. Atualizar permissões
    const { data: updatedPermissions, error: updateError } = await supabase
      .from('user_permissions')
      .update(updateData)
      .eq('user_id', target_user_id)
      .select()
      .single()

    if (updateError) {

      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar permissões' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedPermissions as UserPermissions
    })

  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}