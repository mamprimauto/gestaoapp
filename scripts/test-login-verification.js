#!/usr/bin/env node

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  process.exit(1)
}

// Usar a anon key como faria o cliente
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testUserLogin(email) {
  console.log(`\n🔍 Testando busca de perfil para: ${email}\n`)
  
  try {
    // Primeiro buscar o perfil por email
    console.log('1. Buscando perfil por email...')
    const { data: profileByEmail, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()
    
    if (emailError) {
      console.error('   ❌ Erro ao buscar por email:', emailError.message)
    } else {
      console.log('   ✅ Perfil encontrado por email:')
      console.log('      - ID:', profileByEmail.id)
      console.log('      - Email:', profileByEmail.email)
      console.log('      - Name:', profileByEmail.name)
      console.log('      - Role:', profileByEmail.role)
      console.log('      - Approved:', profileByEmail.approved, `(tipo: ${typeof profileByEmail.approved})`)
      
      // Agora buscar por ID como faria após o login
      console.log('\n2. Buscando perfil por ID...')
      const { data: profileById, error: idError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileByEmail.id)
        .single()
      
      if (idError) {
        console.error('   ❌ Erro ao buscar por ID:', idError.message)
      } else {
        console.log('   ✅ Perfil encontrado por ID:')
        console.log('      - Approved:', profileById.approved, `(tipo: ${typeof profileById.approved})`)
        
        // Testar as verificações de aprovação
        console.log('\n3. Testando verificações de aprovação:')
        console.log(`   - approved === true: ${profileById.approved === true}`)
        console.log(`   - approved === 'true': ${profileById.approved === 'true'}`)
        console.log(`   - approved === 1: ${profileById.approved === 1}`)
        console.log(`   - approved !== true: ${profileById.approved !== true}`)
        
        const isApproved = profileById.approved === true || profileById.approved === 'true' || profileById.approved === 1
        console.log(`   - isApproved (lógica do login): ${isApproved}`)
        
        if (isApproved) {
          console.log('\n   ✅ USUÁRIO APROVADO - LOGIN PERMITIDO')
        } else {
          console.log('\n   ❌ USUÁRIO NÃO APROVADO - LOGIN BLOQUEADO')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Testar com todos os emails
async function testAll() {
  const emails = [
    'igorzimpel@gmail.com',
    'bonecodeteste@gmail.com',
    'testador@gmail.com',
    'iiii@gmail.com'
  ]
  
  for (const email of emails) {
    await testUserLogin(email)
    console.log('\n' + '='.repeat(60))
  }
}

// Executar
testAll()