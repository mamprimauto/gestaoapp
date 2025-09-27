import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { 
  CreateFinancialEmployeeDTO, 
  UpdateFinancialEmployeeDTO
} from "@/lib/financeiro/types"
import { validateFinancialEmployee } from "@/lib/financeiro/calculations"
import { ensureUserHasOrganization } from "@/lib/financeiro/organization-helper"

// ========================================
// GET - Buscar colaboradores
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

    // Buscar colaboradores
    const { data: employees, error: fetchError } = await supabase
      .from("financial_employees")
      .select("*")
      .eq("financial_data_id", financialDataId)
      .order("salary", { ascending: false })

    if (fetchError) {

      return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: employees || [] 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// POST - Criar novo colaborador
// ========================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: CreateFinancialEmployeeDTO = await request.json()

    // Validar dados
    const validationErrors = validateFinancialEmployee(body)
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
    const employeeData = {
      financial_data_id: body.financial_data_id,
      name: body.name.trim(),
      role: body.role.trim(),
      salary: body.salary,
      department: body.department || 'geral',
      employment_type: body.employment_type || 'clt',
      is_active: true
    }

    // Inserir colaborador
    const { data: insertedEmployee, error: insertError } = await supabase
      .from("financial_employees")
      .insert(employeeData)
      .select()
      .single()

    if (insertError) {

      return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: insertedEmployee 
    }, { status: 201 })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// PUT - Atualizar colaborador
// ========================================
export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: UpdateFinancialEmployeeDTO & { id: string } = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Validar dados se fornecidos
    const validationErrors = validateFinancialEmployee(body)
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
    if (body.role !== undefined) updateData.role = body.role.trim()
    if (body.salary !== undefined) updateData.salary = body.salary
    if (body.department !== undefined) updateData.department = body.department
    if (body.employment_type !== undefined) updateData.employment_type = body.employment_type
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    updateData.updated_at = new Date().toISOString()

    // Atualizar colaborador (verificando organização via join)
    const { data: updatedEmployee, error: updateError } = await supabase
      .from("financial_employees")
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

      return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
    }

    if (!updatedEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedEmployee 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================================
// DELETE - Deletar colaborador
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

    // Verificar se o colaborador pertence ao usuário
    const { data: employee, error: findError } = await supabase
      .from("financial_employees")
      .select(`
        id,
        financial_data!inner(organization_id)
      `)
      .eq("id", id)
      .eq("financial_data.organization_id", organizationId)
      .single()

    if (findError || !employee) {
      return NextResponse.json({ error: "Employee not found or unauthorized" }, { status: 404 })
    }

    // Deletar o colaborador
    const { error: deleteError } = await supabase
      .from("financial_employees")
      .delete()
      .eq("id", id)

    if (deleteError) {

      return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Employee deleted successfully" 
    })

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}