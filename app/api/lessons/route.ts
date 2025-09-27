import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerWithSession } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')

    let query = supabase
      .from('lessons')
      .select('*')
      .order('order_index', { ascending: true })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: lessons, error } = await query

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(lessons || [])
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    
    // PERMITIR CRIAÇÃO PÚBLICA - Não requer autenticação
    const body = await request.json()

    // Garantir que order_index tenha um valor padrão
    const lessonData = {
      ...body,
      order_index: body.order_index || 0
    }
    
    const { data, error } = await supabase
      .from('lessons')
      .insert(lessonData)
      .select()
      .single()

    if (error) {

      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint || 'Execute o script SQL: scripts/db/062_fix_all_policies.sql'
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    
    // PERMITIR EDIÇÃO PÚBLICA

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    
    // Verificar senha
    const password = request.headers.get('X-Delete-Password')
    const CORRECT_PASSWORD = '888' // Senha hardcoded (não visível no frontend)
    
    if (password !== CORRECT_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id)

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}