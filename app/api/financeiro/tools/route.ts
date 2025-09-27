import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { 
  CreateFinancialToolDTO, 
  UpdateFinancialToolDTO
} from "@/lib/financeiro/types"
import { validateFinancialTool } from "@/lib/financeiro/calculations"
import { ensureUserHasOrganization } from "@/lib/financeiro/organization-helper"

// ========================================
// GET - Buscar ferramentas
// ========================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const financialDataId = searchParams.get('financial_data_id')

    if (!financialDataId) {
      return NextResponse.json({ error: "financial_data_id is required" }, { status: 400 })
    }

    // Garantir que o usuário tenha uma organização (criar se necessário)
    const { organizationId, error: orgError } = await ensureUserHasOrganization(
      supabase, 
      user.id, 
      user.email
    )

    if (!organizationId || orgError) {
      return NextResponse.json({ 
        error: "Organization setup failed", 
        details: orgError || "Could not create or find organization"
      }, { status: 500 })
    }

    // Verificar se financial_data pertence à organização do usuário
    const { data: financialData } = await supabase
      .from("financial_data")
      .select("id")
      .eq("id", financialDataId)
      .eq("organization_id", organizationId)
      .single()

    if (!financialData) {
      return NextResponse.json({ error: "Financial data not found" }, { status: 404 })
    }

    // Buscar ferramentas
    const { data: tools, error: fetchError } = await supabase
      .from("financial_tools")
      .select("*")
      .eq("financial_data_id", financialDataId)
      .order("cost", { ascending: false })

    if (fetchError) {

      return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: tools || [] 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// POST - Criar nova ferramenta
// ========================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: CreateFinancialToolDTO = await request.json()

    // Validar dados
    const validationErrors = validateFinancialTool(body)
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationErrors 
      }, { status: 400 })
    }

    // Garantir que o usuário tenha uma organização (criar se necessário)
    const { organizationId, error: orgError } = await ensureUserHasOrganization(
      supabase, 
      user.id, 
      user.email
    )

    if (!organizationId || orgError) {
      return NextResponse.json({ 
        error: "Organization setup failed", 
        details: orgError || "Could not create or find organization"
      }, { status: 500 })
    }

    // Verificar se financial_data pertence à organização do usuário
    const { data: financialData } = await supabase
      .from("financial_data")
      .select("id")
      .eq("id", body.financial_data_id)
      .eq("organization_id", organizationId)
      .single()

    if (!financialData) {
      return NextResponse.json({ error: "Financial data not found" }, { status: 404 })
    }

    // Preparar dados para inserção
    const toolData = {
      financial_data_id: body.financial_data_id,
      name: body.name.trim(),
      cost: body.cost,
      category: body.category || 'software',
      description: body.description?.trim() || null,
      is_active: true
    }

    // Inserir ferramenta
    const { data: insertedTool, error: insertError } = await supabase
      .from("financial_tools")
      .insert(toolData)
      .select()
      .single()

    if (insertError) {

      return NextResponse.json({ error: "Failed to create tool" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: insertedTool 
    }, { status: 201 })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// PUT - Atualizar ferramenta
// ========================================
export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: UpdateFinancialToolDTO & { id: string } = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Validar dados se fornecidos
    const validationErrors = validateFinancialTool(body)
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationErrors 
      }, { status: 400 })
    }

    // Garantir que o usuário tenha uma organização (criar se necessário)
    const { organizationId, error: orgError } = await ensureUserHasOrganization(
      supabase, 
      user.id, 
      user.email
    )

    if (!organizationId || orgError) {
      return NextResponse.json({ 
        error: "Organization setup failed", 
        details: orgError || "Could not create or find organization"
      }, { status: 500 })
    }

    // Preparar dados para atualização
    const updateData: any = {}
    
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.cost !== undefined) updateData.cost = body.cost
    if (body.category !== undefined) updateData.category = body.category
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    updateData.updated_at = new Date().toISOString()

    // Atualizar ferramenta (verificando organização via join)
    const { data: updatedTool, error: updateError } = await supabase
      .from("financial_tools")
      .update(updateData)
      .eq("id", body.id)
      .in("financial_data_id", 
        supabase
          .from("financial_data")
          .select("id")
          .eq("organization_id", organizationId)
      )
      .select()
      .single()

    if (updateError) {

      return NextResponse.json({ error: "Failed to update tool" }, { status: 500 })
    }

    if (!updatedTool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedTool 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// DELETE - Deletar ferramenta
// ========================================
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Garantir que o usuário tenha uma organização (criar se necessário)
    const { organizationId, error: orgError } = await ensureUserHasOrganization(
      supabase, 
      user.id, 
      user.email
    )

    if (!organizationId || orgError) {
      return NextResponse.json({ 
        error: "Organization setup failed", 
        details: orgError || "Could not create or find organization"
      }, { status: 500 })
    }

    // Verificar se a ferramenta pertence ao usuário
    const { data: tool, error: findError } = await supabase
      .from("financial_tools")
      .select(`
        id,
        financial_data!inner(organization_id)
      `)
      .eq("id", id)
      .eq("financial_data.organization_id", organizationId)
      .single()

    if (findError || !tool) {
      return NextResponse.json({ error: "Tool not found or unauthorized" }, { status: 404 })
    }

    // Deletar a ferramenta
    const { error: deleteError } = await supabase
      .from("financial_tools")
      .delete()
      .eq("id", id)

    if (deleteError) {

      return NextResponse.json({ error: "Failed to delete tool" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Tool deleted successfully" 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}