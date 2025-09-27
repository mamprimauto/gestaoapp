require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('🔍 Verificando tabelas OKR no Supabase...\n')
  
  const tables = ['okrs', 'key_results', 'okr_tasks', 'okr_assignees']
  let allExist = true
  
  for (const table of tables) {
    try {
      // okr_assignees não tem coluna id, usa key_result_id
      const column = table === 'okr_assignees' ? 'key_result_id' : 'id'
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .limit(1)
      
      if (error) {
        console.log(`❌ ${table}: NÃO EXISTE`)
        console.log(`   Erro: ${error.message}`)
        allExist = false
      } else {
        console.log(`✅ ${table}: Existe e acessível`)
      }
    } catch (err) {
      console.log(`❌ ${table}: Erro ao verificar`)
      allExist = false
    }
  }
  
  console.log('\n' + '='.repeat(50))
  
  if (!allExist) {
    console.log('\n⚠️  AÇÃO NECESSÁRIA:')
    console.log('\n1. Acesse o Supabase Dashboard')
    console.log('2. Vá em SQL Editor')
    console.log('3. Cole e execute TODO o conteúdo de:')
    console.log('   scripts/db/028_okr_system_reset.sql')
    console.log('\n4. Depois, habilite Realtime:')
    console.log('   Database → Replication')
    console.log('   Ative para: okrs, key_results, okr_tasks, okr_assignees')
    console.log('\n5. Reinicie o servidor: npm run dev')
  } else {
    console.log('\n✅ Todas as tabelas OKR estão funcionando!')
    console.log('\nPróximo passo: Habilitar Realtime se ainda não estiver')
    console.log('Database → Replication → Ativar para as 4 tabelas')
  }
}

checkTables()