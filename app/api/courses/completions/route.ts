import { getSupabaseServerWithSession } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    
    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 })
    }

    // Buscar todos os usuários que completaram esta aula
    const { data: completions, error } = await supabase
      .from('lesson_progress')
      .select('completed_at, user_id')
      .eq('lesson_id', lessonId)
      .eq('completed', true)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50) // Limitar a 50 pessoas mais recentes
    
    if (error) {

      return NextResponse.json([])
    }
    
    // Se não houver conclusões, retornar array vazio
    if (!completions || completions.length === 0) {
      return NextResponse.json([])
    }
    
    // Buscar informações dos perfis separadamente
    const userIds = completions.map(c => c.user_id)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('id', userIds)

    if (profileError) {

    }
    
    // Criar um mapa de perfis para acesso rápido
    const profileMap = new Map()
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile)
      })
    }

    // Formatar os dados para a resposta
    const formattedCompletions = completions.map(item => {
      const profile = profileMap.get(item.user_id)
      return {
        userId: item.user_id,
        completedAt: item.completed_at,
        name: profile?.name || `Usuário ${item.user_id.substring(0, 8)}`,
        email: profile?.email,
        avatarUrl: profile?.avatar_url
      }
    })

    return NextResponse.json(formattedCompletions)
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}