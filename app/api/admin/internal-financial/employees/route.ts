import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerWithSession } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()
    const { searchParams } = new URL(request.url)
    const financialDataId = searchParams.get('financial_data_id')

    // Verificar se o usuário está autenticado
    if (!user || authError) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'administrador') || !profile.approved) {
      return NextResponse.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 })
    }

    if (!financialDataId) {
      return NextResponse.json({ error: 'financial_data_id é obrigatório' }, { status: 400 })
    }

    // Buscar colaboradores para o período financeiro específico
    const { data, error } = await supabase
      .from('financial_employees')
      .select('*')
      .eq('financial_data_id', financialDataId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()
    const body = await request.json()

    // Verificar se o usuário está autenticado
    if (!user || authError) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'administrador') || !profile.approved) {
      return NextResponse.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 })
    }

    const { financial_data_id, nome, cargo, salario } = body

    // Validações
    if (!financial_data_id || !nome || !cargo || salario === undefined) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: financial_data_id, nome, cargo, salario' 
      }, { status: 400 })
    }

    if (salario < 0) {
      return NextResponse.json({ 
        error: 'Salário deve ser um valor positivo' 
      }, { status: 400 })
    }

    // Verificar se o financial_data_id existe
    const { data: financialData, error: financialError } = await supabase
      .from('internal_financial_data')
      .select('id')
      .eq('id', financial_data_id)
      .single()

    if (financialError || !financialData) {
      return NextResponse.json({ 
        error: 'Período financeiro não encontrado' 
      }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('financial_employees')
      .insert([{
        financial_data_id,
        nome,
        cargo,
        salario: parseFloat(salario)
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Colaborador adicionado com sucesso' })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()
    const body = await request.json()

    // Verificar se o usuário está autenticado
    if (!user || authError) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'administrador') || !profile.approved) {
      return NextResponse.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 })
    }

    const { id, nome, cargo, salario } = body

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório para atualização' }, { status: 400 })
    }

    if (salario !== undefined && salario < 0) {
      return NextResponse.json({ 
        error: 'Salário deve ser um valor positivo' 
      }, { status: 400 })
    }

    // Preparar dados para atualização
    const updateData: any = { updated_at: new Date() }
    if (nome !== undefined) updateData.nome = nome
    if (cargo !== undefined) updateData.cargo = cargo
    if (salario !== undefined) updateData.salario = parseFloat(salario)

    const { data, error } = await supabase
      .from('financial_employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Colaborador atualizado com sucesso' })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseServerWithSession()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // Verificar se o usuário está autenticado
    if (!user || authError) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'administrador') || !profile.approved) {
      return NextResponse.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('financial_employees')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Colaborador removido com sucesso' })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}