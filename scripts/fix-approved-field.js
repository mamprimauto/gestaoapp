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

async function fixApprovedField() {
  console.log('🔧 Corrigindo campo approved nos perfis...\n')
  
  try {
    // Buscar todos os perfis
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, approved, role')
    
    if (fetchError) {
      console.error('❌ Erro ao buscar perfis:', fetchError)
      return
    }
    
    console.log(`📊 Total de perfis encontrados: ${profiles.length}`)
    
    // Identificar perfis com problema
    const profilesWithIssue = profiles.filter(p => 
      p.approved === null || 
      p.approved === undefined || 
      typeof p.approved !== 'boolean'
    )
    
    console.log(`⚠️  Perfis com approved null/undefined: ${profilesWithIssue.length}`)
    
    if (profilesWithIssue.length === 0) {
      console.log('✅ Todos os perfis já estão corretos!')
      return
    }
    
    // Corrigir cada perfil
    for (const profile of profilesWithIssue) {
      console.log(`\n📝 Processando: ${profile.email}`)
      console.log(`   - ID: ${profile.id}`)
      console.log(`   - Role: ${profile.role}`)
      console.log(`   - Approved atual: ${profile.approved} (tipo: ${typeof profile.approved})`)
      
      // Definir approved baseado no role
      // Admin = true, outros = false (precisam aprovação)
      const shouldBeApproved = profile.role === 'admin'
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          approved: shouldBeApproved,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
      
      if (updateError) {
        console.error(`   ❌ Erro ao atualizar: ${updateError.message}`)
      } else {
        console.log(`   ✅ Atualizado para: approved = ${shouldBeApproved}`)
      }
    }
    
    console.log('\n🎉 Processo concluído!')
    
    // Verificar resultado final
    const { data: finalCheck } = await supabase
      .from('profiles')
      .select('approved')
    
    const stillWithIssue = finalCheck.filter(p => 
      p.approved === null || 
      p.approved === undefined || 
      typeof p.approved !== 'boolean'
    )
    
    if (stillWithIssue.length === 0) {
      console.log('✅ Todos os perfis agora têm campo approved válido!')
    } else {
      console.log(`⚠️  Ainda há ${stillWithIssue.length} perfis com problema`)
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
fixApprovedField()