import { getSupabaseServerWithSession } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    const body = await request.json()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert(body)
      .select()
      .single()

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(lesson)
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 })
    }

    const { data: lesson, error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(lesson)
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    const { searchParams } = new URL(request.url)
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