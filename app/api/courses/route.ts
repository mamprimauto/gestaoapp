import { getSupabaseServerWithSession } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        lessons (
          id,
          title,
          video_id,
          video_type,
          duration_seconds,
          order_index
        )
      `)
      .order('order_index', { ascending: true })
      .order('order_index', { foreignTable: 'lessons', ascending: true })

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(courses || [])
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    const body = await request.json()

    // PERMITIR CRIAÇÃO PÚBLICA - Não requer autenticação
    const courseData = user 
      ? { ...body, created_by: user.id }
      : body

    const { data: course, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single()

    if (error) {

      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint 
      }, { status: 500 })
    }

    return NextResponse.json(course)
  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message 
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
    }

    // PERMITIR EDIÇÃO PÚBLICA
    const { data: course, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(course)
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Verificar senha
    const password = request.headers.get('X-Delete-Password')
    const CORRECT_PASSWORD = '888' // Senha hardcoded (não visível no frontend)
    
    if (password !== CORRECT_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('courses')
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