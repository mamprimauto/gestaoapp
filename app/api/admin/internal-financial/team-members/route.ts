import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // Buscar todos os membros da equipe exceto admins
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, full_name, email, role, approved')
      .not('role', 'in', '("admin","administrador")')
      .eq('approved', true)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Formatar dados para facilitar uso no frontend
    const teamMembers = (data || []).map(member => ({
      id: member.id,
      name: member.full_name || member.name || member.email,
      email: member.email,
      role: member.role,
      displayName: `${member.full_name || member.name || 'Sem nome'} (${member.role || 'sem cargo'})`
    }))

    return NextResponse.json({ data: teamMembers })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}