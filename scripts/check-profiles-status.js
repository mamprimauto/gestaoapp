#!/usr/bin/env node

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProfiles() {
  console.log('🔍 Verificando status dos perfis...\n')
  
  try {
    // Buscar todos os perfis
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, name, role, approved, created_at')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Erro ao buscar perfis:', fetchError)
      return
    }
    
    console.log(`📊 Total de perfis: ${profiles.length}\n`)
    
    // Separar por status
    const approved = profiles.filter(p => p.approved === true)
    const notApproved = profiles.filter(p => p.approved === false)
    const nullApproved = profiles.filter(p => p.approved === null || p.approved === undefined)
    
    console.log('✅ Usuários APROVADOS:')
    if (approved.length === 0) {
      console.log('   Nenhum usuário aprovado')
    } else {
      approved.forEach(p => {
        console.log(`   - ${p.email} (${p.role}) - ${p.name || 'Sem nome'}`)
      })
    }
    
    console.log('\n⏳ Usuários NÃO APROVADOS:')
    if (notApproved.length === 0) {
      console.log('   Nenhum usuário aguardando aprovação')
    } else {
      notApproved.forEach(p => {
        console.log(`   - ${p.email} (${p.role}) - ${p.name || 'Sem nome'}`)
      })
    }
    
    console.log('\n⚠️ Usuários com approved NULL/UNDEFINED:')
    if (nullApproved.length === 0) {
      console.log('   Nenhum usuário com problema')
    } else {
      nullApproved.forEach(p => {
        console.log(`   - ${p.email} (${p.role}) - ${p.name || 'Sem nome'} - approved: ${p.approved}`)
      })
    }
    
    // Verificar tipo dos campos
    console.log('\n🔧 Verificação de tipos:')
    profiles.forEach(p => {
      console.log(`   ${p.email}: approved=${p.approved} (tipo: ${typeof p.approved})`)
    })
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
checkProfiles()