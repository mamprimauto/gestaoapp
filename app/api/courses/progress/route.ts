import { getSupabaseServerWithSession } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const lessonId = searchParams.get('lessonId')
    
    // Return empty array for unauthenticated users instead of 401
    if (!user) {
      return NextResponse.json([])
    }

    let query = supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    if (lessonId) {
      query = query.eq('lesson_id', lessonId)
    }

    const { data: progress, error } = await query

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(progress || [])
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    const body = await request.json()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lesson_id, course_id, progress_percentage, last_position_seconds } = body

    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id,
        course_id,
        progress_percentage,
        last_position_seconds
      }, {
        onConflict: 'user_id,lesson_id'
      })
      .select()
      .single()

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(progress)
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { lesson_id, completed, progress_percentage } = body

    // Try to get user from session
    const { supabase, user } = await getSupabaseServerWithSession()

    // If no user in server session, try to get from Authorization header
    let actualUserId = user?.id
    
    if (!actualUserId) {
      // Try alternative authentication method
      const authHeader = request.headers.get('authorization')

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)

        if (authError) {

        }
        actualUserId = authUser?.id
      }
    }

    if (!actualUserId) {
      // Still no user - for now, allow anonymous progress (stored by session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, try to get the course_id from existing progress or from lessons table
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('course_id')
      .eq('id', lesson_id)
      .single()

    if (!lessonData) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Use upsert to create or update the record

    // Try a simpler approach - just update or insert without checking first
    const progressData = {
      user_id: actualUserId,
      lesson_id,
      course_id: lessonData.course_id,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      progress_percentage: progress_percentage || (completed ? 100 : 0),
      last_position_seconds: 0,
      updated_at: new Date().toISOString()
    }

    // First try to update
    const { data: updateData, error: updateError } = await supabase
      .from('lesson_progress')
      .update({
        completed: progressData.completed,
        completed_at: progressData.completed_at,
        progress_percentage: progressData.progress_percentage,
        last_position_seconds: progressData.last_position_seconds,
        updated_at: progressData.updated_at
      })
      .eq('user_id', actualUserId)
      .eq('lesson_id', lesson_id)
      .select()
    
    let progress = updateData?.[0]
    let error = null
    
    // If no rows were updated, insert a new one
    if (!updateData || updateData.length === 0) {

      const { data: insertData, error: insertError } = await supabase
        .from('lesson_progress')
        .insert(progressData)
        .select()
        .single()
      
      progress = insertData
      error = insertError
    } else if (updateError) {
      error = updateError
    }

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(progress)
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}