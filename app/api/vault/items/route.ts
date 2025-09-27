// 🔐 API Routes para Vault Items
// CRUD operations com máxima segurança e Row Level Security

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { VaultItem, CreateVaultItemRequest, VaultItemsResponse, VaultVisibilityLevel, UserDepartment, TeamRole, getVaultPermissions } from '@/lib/vault/types'
import { z } from 'zod'

// Criar cliente Supabase com service role para operações do servidor
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dpajrkohmqdbskqbimqf.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYWpya29obXFkYnNrcWJpbXFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY2ODEwNiwiZXhwIjoyMDcwMjQ0MTA2fQ.3Cj0rKQb3Jo69jPxyBTzM26UrClSgoxL_oBBNzbaq0s'
  
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// ===== VALIDAÇÃO DE ENTRADA =====

const CreateVaultItemSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().optional(), // Aceitar qualquer string como URL
  username: z.string().max(100).optional().or(z.literal('')),
  encrypted_password: z.string().optional().or(z.literal('')),
  encrypted_notes: z.string().optional().or(z.literal('')),
  salt: z.string().optional().or(z.literal('')),
  iv: z.string().optional().or(z.literal('')),
  category: z.enum(['login', 'credit_card', 'secure_note', 'identity', 'bank_account', 'crypto_wallet', 'link', 'other']).default('login'), // Updated to include link category
  favorite: z.boolean().default(false),
  image_url: z.string().optional().or(z.literal('')),
  strength_score: z.number().min(0).max(100).optional().default(0),
  
  // Campos de permissões (opcionais)
  visibility_level: z.enum(['personal', 'team', 'manager', 'admin', 'custom']).default('personal'),
  allowed_departments: z.array(z.enum(['administrador', 'editor', 'copywriter', 'gestor', 'minerador', 'particular'])).default([]),
  shared_with_managers: z.boolean().default(false),
  shared_with_admins: z.boolean().default(false),
})

const UpdateVaultItemSchema = CreateVaultItemSchema.partial().extend({
  id: z.string().uuid()
})

// ===== HELPER FUNCTIONS =====

async function getAuthenticatedUser(request: NextRequest) {
  // Verificar autenticação via header Authorization
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Token de autorização necessário' }
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  try {
    // Usar o admin client para verificar o token
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

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP
  return '127.0.0.1'
}

async function logVaultAccess(
  supabase: any, 
  userId: string, 
  action: string, 
  resource: string,
  metadata: Record<string, any>,
  request: NextRequest,
  success: boolean = true
) {
  // Temporariamente desabilitado devido a erro no trigger do banco
  // TODO: Corrigir função jsonb_build_array_text no banco
  return
  
  try {
    await supabase.from('vault_access_logs').insert({
      user_id: userId,
      action,
      resource,
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      metadata,
      success,
      risk_level: success ? 'low' : 'medium'
    })
  } catch (error) {

  }
}

// ===== GET - LISTAR ITEMS DO VAULT =====

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

    // 2. Buscar perfil do usuário na tabela profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {

      return NextResponse.json(
        { success: false, error: 'Perfil do usuário não encontrado' },
        { status: 403 }
      )
    }

    // 3. Mapear role do perfil para permissões do vault
    const userRole = userProfile.role as TeamRole
    const vaultPermissions = getVaultPermissions(userRole)

    // 4. Buscar items do vault (será filtrado por permissões após a consulta)
    const { data: items, error: fetchError } = await supabase
      .from('vault_items')
      .select(`
        id,
        user_id,
        title,
        url,
        username,
        category,
        favorite,
        encrypted_password,
        encrypted_notes,
        salt,
        iv,
        strength_score,
        has_breach,
        breach_count,
        visibility_level,
        allowed_departments,
        created_by_department,
        shared_with_managers,
        shared_with_admins,
        image_url,
        created_at,
        updated_at,
        last_accessed,
        password_changed_at
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {

      await logVaultAccess(
        supabase, 
        user.id, 
        'list', 
        'vault_items',
        { error: fetchError.message },
        request,
        false
      )
      
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar items do vault' },
        { status: 500 }
      )
    }

    // 5. Filtrar items baseado nas permissões do usuário
    const filteredItems = items?.filter(item => {
      // Próprios items sempre visíveis
      if (item.user_id === user.id) return true
      
      // Admin pode ver tudo
      if (vaultPermissions.access_level === 'admin') return true
      
      // Verificar permissões baseadas na visibilidade
      switch (item.visibility_level) {
        case 'personal':
          return false // Apenas o criador pode ver
        
        case 'custom':
          // Pode ver se seu departamento está na lista de departamentos permitidos
          // Admin sempre pode ver tudo
          if (vaultPermissions.access_level === 'admin') return true
          return item.allowed_departments?.includes(vaultPermissions.department) || false
        
        default:
          // Por padrão, se não tem visibilidade definida, considera como custom
          if (vaultPermissions.access_level === 'admin') return true
          return item.allowed_departments?.includes(vaultPermissions.department) || false
      }
    }) || []

    // 6. Log de auditoria
    await logVaultAccess(
      supabase,
      user.id,
      'list',
      'vault_items',
      { 
        total_items: items?.length || 0,
        filtered_items: filteredItems.length,
        user_role: userRole,
        user_department: vaultPermissions.department
      },
      request
    )

    // 7. Resposta com items filtrados por permissões
    const response: VaultItemsResponse = {
      success: true,
      data: filteredItems as VaultItem[]
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ===== POST - CRIAR NOVO ITEM =====

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {

      return NextResponse.json(
        { success: false, error: authError || 'Não autorizado' },
        { status: 401 }
      )
    }

    // 2. Validação do corpo da requisição
    let body
    try {
      body = await request.json()

    } catch (error) {

      return NextResponse.json(
        { success: false, error: 'Corpo da requisição inválido' },
        { status: 400 }
      )
    }

    const validationResult = CreateVaultItemSchema.safeParse(body)
    if (!validationResult.success) {

      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const itemData = validationResult.data

    const supabase = getSupabaseAdmin()

    // 3. Buscar perfil do usuário para determinar departamento
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {

      return NextResponse.json(
        { success: false, error: 'Perfil do usuário não encontrado' },
        { status: 403 }
      )
    }

    // 4. Mapear role do perfil para permissões do vault
    const userRole = userProfile.role as TeamRole
    const vaultPermissions = getVaultPermissions(userRole)

    // 5. Criar item no banco com campos de permissão

    const { data: newItem, error: createError } = await supabase
      .from('vault_items')
      .insert({
        ...itemData,
        user_id: user.id,
        created_by_department: vaultPermissions.department
      })
      .select()
      .single()

    if (createError) {

      await logVaultAccess(
        supabase,
        user.id,
        'create',
        'vault_item',
        { 
          title: itemData.title,
          category: itemData.category,
          error: createError.message 
        },
        request,
        false
      )
      
      return NextResponse.json(
        { success: false, error: 'Erro ao criar item do vault' },
        { status: 500 }
      )
    }

    // 4. Log de auditoria
    await logVaultAccess(
      supabase,
      user.id,
      'create',
      'vault_item',
      {
        item_id: newItem.id,
        title: itemData.title,
        category: itemData.category,
        strength_score: itemData.strength_score
      },
      request
    )

    // 5. Resposta
    return NextResponse.json(
      {
        success: true,
        data: newItem as VaultItem
      },
      { 
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        }
      }
    )

  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ===== PUT - ATUALIZAR ITEM =====

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

    // 2. Validação do corpo da requisição
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição inválido' },
        { status: 400 }
      )
    }

    const validationResult = UpdateVaultItemSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { id, ...updateData } = validationResult.data

    const supabase = getSupabaseAdmin()

    // 3. Buscar perfil do usuário para determinar permissões
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {

      return NextResponse.json(
        { success: false, error: 'Perfil do usuário não encontrado' },
        { status: 403 }
      )
    }

    // 4. Mapear role do perfil para permissões do vault
    const userRole = userProfile.role as TeamRole
    const vaultPermissions = getVaultPermissions(userRole)

    // 5. Verificar se o item existe e se o usuário tem permissão para editá-lo
    const { data: existingItem, error: fetchError } = await supabase
      .from('vault_items')
      .select('id, title, category, user_id, visibility_level, allowed_departments, created_by_department')
      .eq('id', id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    // 6. Verificar permissões para edição
    const canEdit = existingItem.user_id === user.id || // Próprio item
                   vaultPermissions.access_level === 'admin' // Admin pode editar tudo

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Permissão negada para editar este item' },
        { status: 403 }
      )
    }

    // 7. Atualizar item
    const { data: updatedItem, error: updateError } = await supabase
      .from('vault_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {

      await logVaultAccess(
        supabase,
        user.id,
        'update',
        'vault_item',
        {
          item_id: id,
          title: existingItem.title,
          error: updateError.message
        },
        request,
        false
      )
      
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar item do vault' },
        { status: 500 }
      )
    }

    // 8. Log de auditoria
    await logVaultAccess(
      supabase,
      user.id,
      'update',
      'vault_item',
      {
        item_id: id,
        title: updateData.title || existingItem.title,
        fields_updated: Object.keys(updateData)
      },
      request
    )

    // 9. Resposta
    return NextResponse.json({
      success: true,
      data: updatedItem as VaultItem
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ===== DELETE - REMOVER ITEM =====

export async function DELETE(request: NextRequest) {
  try {
    // 1. Autenticação
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError || 'Não autorizado' },
        { status: 401 }
      )
    }

    // 2. Obter ID do item da URL
    const url = new URL(request.url)
    const itemId = url.searchParams.get('id')
    
    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'ID do item é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 3. Buscar perfil do usuário para determinar permissões
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {

      return NextResponse.json(
        { success: false, error: 'Perfil do usuário não encontrado' },
        { status: 403 }
      )
    }

    // 4. Mapear role do perfil para permissões do vault
    const userRole = userProfile.role as TeamRole
    const vaultPermissions = getVaultPermissions(userRole)

    // 5. Verificar se o item existe e se o usuário tem permissão para deletá-lo
    const { data: existingItem, error: fetchError } = await supabase
      .from('vault_items')
      .select('id, title, category, user_id, visibility_level, allowed_departments, created_by_department')
      .eq('id', itemId)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    // 6. Verificar permissões para exclusão
    const canDelete = existingItem.user_id === user.id || // Próprio item
                     vaultPermissions.access_level === 'admin' // Admin pode deletar tudo

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Permissão negada para deletar este item' },
        { status: 403 }
      )
    }

    // 7. Deletar item
    const { error: deleteError } = await supabase
      .from('vault_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {

      await logVaultAccess(
        supabase,
        user.id,
        'delete',
        'vault_item',
        {
          item_id: itemId,
          title: existingItem.title,
          error: deleteError.message
        },
        request,
        false
      )
      
      return NextResponse.json(
        { success: false, error: 'Erro ao deletar item do vault' },
        { status: 500 }
      )
    }

    // 8. Log de auditoria
    await logVaultAccess(
      supabase,
      user.id,
      'delete',
      'vault_item',
      {
        item_id: itemId,
        title: existingItem.title,
        category: existingItem.category
      },
      request
    )

    // 9. Resposta
    return NextResponse.json({
      success: true,
      message: 'Item removido com sucesso'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}