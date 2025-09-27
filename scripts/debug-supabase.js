// Script para debug do Supabase
// Execute com: node scripts/debug-supabase.js

const { createClient } = require('@supabase/supabase-js')

// Substitua com suas credenciais
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'SUA_URL_AQUI'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'SUA_ANON_KEY_AQUI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugStorage() {
  console.log('🔍 Verificando Storage...\n')
  
  // Listar buckets
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets()
  
  if (bucketsError) {
    console.error('❌ Erro ao listar buckets:', bucketsError)
  } else {
    console.log('✅ Buckets encontrados:')
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'Público' : 'Privado'})`)
    })
  }
  
  // Verificar bucket específico
  const bucketName = 'swipe-file-comments'
  const { data: files, error: filesError } = await supabase
    .storage
    .from(bucketName)
    .list()
  
  if (filesError) {
    console.error(`\n❌ Erro ao acessar bucket '${bucketName}':`, filesError.message)
  } else {
    console.log(`\n✅ Bucket '${bucketName}' acessível`)
    console.log(`  Arquivos no bucket: ${files.length}`)
  }
}

async function debugDatabase() {
  console.log('\n🔍 Verificando Database...\n')
  
  // Verificar tabelas
  const tables = [
    'swipe_files',
    'swipe_file_comments',
    'swipe_file_tracking',
    'swipe_niches'
  ]
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error(`❌ Tabela '${table}': ${error.message}`)
    } else {
      console.log(`✅ Tabela '${table}': ${count} registros`)
    }
  }
}

async function debugAuth() {
  console.log('\n🔍 Verificando Autenticação...\n')
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('❌ Erro de autenticação:', error.message)
  } else if (user) {
    console.log('✅ Usuário autenticado:')
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
  } else {
    console.log('⚠️  Nenhum usuário autenticado')
  }
}

// Executar debug
async function runDebug() {
  console.log('=================================')
  console.log('    SUPABASE DEBUG TOOL')
  console.log('=================================\n')
  console.log(`URL: ${supabaseUrl}\n`)
  
  await debugStorage()
  await debugDatabase()
  await debugAuth()
  
  console.log('\n=================================')
  console.log('    DEBUG COMPLETO')
  console.log('=================================')
}

runDebug().catch(console.error)