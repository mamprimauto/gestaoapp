import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerWithSession } from "@/lib/supabase/server"
import { 
  FinancialData, 
  CreateFinancialDataDTO, 
  UpdateFinancialDataDTO,
  FinancialDataWithRelations
} from "@/lib/financeiro/types"
import { 
  validateFinancialData, 
  calculateTaxes, 
  calculateNetProfit, 
  calculateProfitMargin 
} from "@/lib/financeiro/calculations"
import { ensureUserHasOrganization } from "@/lib/financeiro/organization-helper"

// ========================================
// GET - Buscar dados financeiros
// ========================================
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()

    if (authError || !supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extrair parâmetros da query
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
    const includeTools = searchParams.get('include_tools') === 'true'
    const includeEmployees = searchParams.get('include_employees') === 'true'

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

    let query = supabase
      .from("financial_data")
      .select(`
        *
        ${includeTools ? ', tools:financial_tools(*)' : ''}
        ${includeEmployees ? ', employees:financial_employees(*)' : ''}
      `)
      .eq("organization_id", organizationId)
      .eq("year", year)

    // Se mês específico for fornecido, filtrar por ele
    if (month) {
      query = query.eq("month", month)
    }

    query = query.order("month", { ascending: true })

    const { data: financialData, error: fetchError } = await query

    if (fetchError) {

      return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
    }

    // Se buscar um mês específico, retornar apenas o primeiro resultado
    if (month) {
      if (financialData && financialData.length > 0) {
        return NextResponse.json({ 
          success: true, 
          data: financialData[0] 
        })
      } else {
        // No data found for specific month
        return NextResponse.json({ 
          success: true, 
          data: null 
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: financialData || [] 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// POST - Criar novos dados financeiros
// ========================================
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()

    // Debug logging

    if (authError || !supabase || !user) {

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: CreateFinancialDataDTO = await request.json()

    // Validar dados
    const validationErrors = validateFinancialData(body)
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

    // Calcular valores automáticos
    const taxPercentage = body.tax_percentage || 0.0
    const taxes = calculateTaxes(body.revenue, taxPercentage)
    
    // Preparar dados para inserção
    const financialData = {
      organization_id: organizationId,
      user_id: user.id,
      month: body.month,
      year: body.year,
      revenue: body.revenue,
      facebook_investment: body.facebook_investment || 0,
      google_investment: body.google_investment || 0,
      taxes: taxes,
      tax_percentage: taxPercentage,
      return_amount: body.return_amount || 0,
      profit_percentage: body.profit_percentage || 15.0,
      total_tools_cost: 0, // Será calculado pelos triggers
      total_employee_cost: 0, // Será calculado pelos triggers
      net_profit: 0, // Será calculado pelos triggers
      profit_margin: 0 // Será calculado pelos triggers
    }

    // Inserir dados
    const { data: insertedData, error: insertError } = await supabase
      .from("financial_data")
      .insert(financialData)
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: `Dados financeiros para ${body.month}/${body.year} já existem` 
        }, { status: 409 })
      }

      return NextResponse.json({ error: "Failed to create financial data" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: insertedData 
    }, { status: 201 })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// PUT - Atualizar dados financeiros
// ========================================
export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()

    if (authError || !supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: UpdateFinancialDataDTO & { id: string } = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Validar dados se fornecidos
    const validationErrors = validateFinancialData(body)
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
    
    if (body.revenue !== undefined) updateData.revenue = body.revenue
    if (body.facebook_investment !== undefined) updateData.facebook_investment = body.facebook_investment
    if (body.google_investment !== undefined) updateData.google_investment = body.google_investment
    if (body.tax_percentage !== undefined) {
      updateData.tax_percentage = body.tax_percentage
      // Recalcular impostos se percentual mudou
      if (body.revenue) {
        updateData.taxes = calculateTaxes(body.revenue, body.tax_percentage)
      }
    }
    if (body.return_amount !== undefined) updateData.return_amount = body.return_amount
    if (body.profit_percentage !== undefined) updateData.profit_percentage = body.profit_percentage

    updateData.updated_at = new Date().toISOString()

    // Atualizar dados
    const { data: updatedData, error: updateError } = await supabase
      .from("financial_data")
      .update(updateData)
      .eq("id", body.id)
      .eq("organization_id", organizationId) // Garantir que só atualiza da própria org
      .select()
      .single()

    if (updateError) {

      return NextResponse.json({ error: "Failed to update financial data" }, { status: 500 })
    }

    if (!updatedData) {
      return NextResponse.json({ error: "Financial data not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedData 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// DELETE - Deletar dados financeiros
// ========================================
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()

    if (authError || !supabase || !user) {
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

    // Deletar dados (cascade irá deletar ferramentas e colaboradores relacionados)
    const { error: deleteError } = await supabase
      .from("financial_data")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId) // Garantir que só deleta da própria org

    if (deleteError) {

      return NextResponse.json({ error: "Failed to delete financial data" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Financial data deleted successfully" 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}