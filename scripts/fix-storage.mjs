// Script para verificar e corrigir o Storage do Supabase
// Execute com: node scripts/fix-storage.mjs

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenciais do Supabase não encontradas no .env.local')
  process.exit(1)
}

// Cliente com anon key
const supabase = createClient(supabaseUrl, supabaseKey)

// Cliente admin (se disponível)
const supabaseAdmin = serviceKey 
  ? createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null

async function checkBucket() {
  console.log('🔍 Verificando bucket swipe-file-comments...\n')
  
  try {
    // Tentar listar arquivos no bucket
    const { data, error } = await supabase
      .storage
      .from('swipe-file-comments')
      .list()
    
    if (error) {
      console.error('❌ Erro ao acessar bucket:', error.message)
      
      if (error.message.includes('not found')) {
        console.log('\n⚠️  Bucket não existe! Você precisa criar no Dashboard do Supabase:')
        console.log('1. Acesse: https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/storage/buckets')
        console.log('2. Clique em "New bucket"')
        console.log('3. Nome: swipe-file-comments')
        console.log('4. Marque como PUBLIC')
        console.log('5. Clique em Create')
      }
      
      return false
    }
    
    console.log('✅ Bucket existe e está acessível')
    console.log(`   Arquivos no bucket: ${data?.length || 0}`)
    return true
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err)
    return false
  }
}

async function testUpload() {
  console.log('\n🧪 Testando upload...\n')
  
  try {
    // Criar um arquivo de teste
    const testContent = 'Test file for swipe-file-comments'
    const testFile = new Blob([testContent], { type: 'text/plain' })
    const fileName = `test-${Date.now()}.txt`
    
    // Tentar fazer upload
    const { data, error } = await supabase
      .storage
      .from('swipe-file-comments')
      .upload(fileName, testFile)
    
    if (error) {
      console.error('❌ Erro no upload:', error.message)
      
      if (error.message.includes('authorization')) {
        console.log('\n⚠️  Problema de autorização. Verifique:')
        console.log('1. Se você está logado no app')
        console.log('2. Se as políticas do bucket estão corretas')
      }
      
      return false
    }
    
    console.log('✅ Upload de teste bem-sucedido!')
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase
      .storage
      .from('swipe-file-comments')
      .getPublicUrl(fileName)
    
    console.log('   URL pública:', publicUrl)
    
    // Limpar arquivo de teste
    await supabase
      .storage
      .from('swipe-file-comments')
      .remove([fileName])
    
    return true
    
  } catch (err) {
    console.error('❌ Erro no teste:', err)
    return false
  }
}

async function checkTables() {
  console.log('\n📊 Verificando tabelas do banco...\n')
  
  const tables = [
    'swipe_files',
    'swipe_file_comments',
    'swipe_file_tracking',
    'swipe_niches'
  ]
  
  let allOk = true
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error(`❌ Tabela '${table}': ${error.message}`)
      allOk = false
    } else {
      console.log(`✅ Tabela '${table}': OK (${count} registros)`)
    }
  }
  
  return allOk
}

async function main() {
  console.log('=================================')
  console.log('   VERIFICAÇÃO DO STORAGE')
  console.log('=================================\n')
  console.log(`Projeto: ${supabaseUrl}\n`)
  
  // Verificar bucket
  const bucketOk = await checkBucket()
  
  // Se bucket existe, testar upload
  if (bucketOk) {
    await testUpload()
  }
  
  // Verificar tabelas
  await checkTables()
  
  console.log('\n=================================')
  console.log('   RESUMO')
  console.log('=================================\n')
  
  if (!bucketOk) {
    console.log('⚠️  AÇÃO NECESSÁRIA:')
    console.log('1. Crie o bucket "swipe-file-comments" no Dashboard')
    console.log('2. Marque como PUBLIC')
    console.log('3. Execute os scripts SQL para criar as políticas')
    console.log('\nLink direto: https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/storage/buckets')
  } else {
    console.log('✅ Storage configurado corretamente!')
  }
}

main().catch(console.error)