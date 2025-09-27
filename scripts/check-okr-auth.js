require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOKRAuth() {
  console.log('🔍 Verificando autenticação e políticas OKR...\n')
  
  // 1. Verificar se as tabelas existem
  console.log('1. Verificando tabelas...')
  const tables = ['okrs', 'key_results', 'okr_tasks', 'okr_assignees']
  let allTablesExist = true
  
  for (const table of tables) {
    try {
      const column = table === 'okr_assignees' ? 'key_result_id' : 'id'
      const { error } = await supabase
        .from(table)
        .select(column)
        .limit(1)
      
      if (error) {
        console.log(`❌ ${table}: NÃO EXISTE - ${error.message}`)
        allTablesExist = false
      } else {
        console.log(`✅ ${table}: Existe`)
      }
    } catch (err) {
      console.log(`❌ ${table}: Erro ao verificar`)
      allTablesExist = false
    }
  }
  
  if (!allTablesExist) {
    console.log('\n⚠️  Execute primeiro: scripts/db/028_okr_system_reset.sql')
    return
  }
  
  console.log('\n2. Testando inserção sem autenticação...')
  
  // 2. Tentar inserir um OKR sem autenticação (deve falhar)
  try {
    const { data, error } = await supabase
      .from('okrs')
      .insert({
        week: 33,
        year: 2025,
        title: 'Teste sem auth',
        focus: 'Teste',
        status: 'planned'
      })
      .select()
    
    if (error) {
      if (error.message.includes('Row Level Security')) {
        console.log('✅ RLS está funcionando - inserção bloqueada sem auth')
      } else {
        console.log(`❌ Erro inesperado: ${error.message}`)
      }
    } else {
      console.log('⚠️  RLS NÃO está funcionando - inserção passou sem auth!')
      console.log('   Isso pode ser um problema de segurança')
    }
  } catch (err) {
    console.log(`❌ Erro na conexão: ${err.message}`)
  }
  
  console.log('\n3. Verificando políticas RLS...')
  
  // 3. Verificar políticas RLS existentes
  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd, permissive, roles, qual, with_check')
      .in('tablename', tables)
    
    if (error) {
      console.log(`❌ Não foi possível verificar políticas: ${error.message}`)
    } else if (!policies || policies.length === 0) {
      console.log('⚠️  Nenhuma política RLS encontrada!')
      console.log('   Execute: scripts/db/028_okr_system_reset.sql')
    } else {
      console.log(`✅ Encontradas ${policies.length} políticas RLS:`)
      policies.forEach(p => {
        console.log(`   - ${p.tablename}.${p.policyname} (${p.cmd})`)
      })
    }
  } catch (err) {
    console.log('⚠️  Não foi possível verificar políticas (normal em alguns setups)')
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n📋 DIAGNÓSTICO:')
  console.log('\nSe você está vendo "401 Unauthorized" ao criar OKRs:')
  console.log('1. ✅ As tabelas existem')
  console.log('2. ✅ O RLS está funcionando (bloqueia sem auth)')
  console.log('3. ❌ O token JWT do usuário não está sendo enviado')
  
  console.log('\n🔧 PRÓXIMOS PASSOS:')
  console.log('1. Certifique-se de estar logado na aplicação')
  console.log('2. Verifique no Console do navegador (F12) se aparece:')
  console.log('   "Criando OKR para usuário: [user-id]"')
  console.log('3. Se não aparecer, o usuário não está autenticado')
  console.log('4. Se aparecer mas der 401, as políticas RLS precisam ajuste')
  
  console.log('\n🆘 SOLUÇÃO TEMPORÁRIA:')
  console.log('Execute: scripts/db/029_fix_okr_auth.sql')
  console.log('Isso vai simplificar as políticas para teste')
}

checkOKRAuth()