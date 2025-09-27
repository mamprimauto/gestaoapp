// Script para testar upload de imagem no bucket swipe-file-comments
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenciais do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testImageUpload() {
  console.log('🧪 Testando upload de imagem...\n')
  
  try {
    // Fazer login com um usuário de teste
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Substitua com um email real
      password: 'testpassword' // Substitua com a senha real
    })
    
    if (authError) {
      console.log('⚠️  Não foi possível fazer login. Tentando com usuário anônimo...')
      
      // Tentar obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('❌ Nenhum usuário autenticado. Faça login no app primeiro.')
        return false
      }
      
      console.log('✅ Usando usuário atual:', user.email)
    } else {
      console.log('✅ Login bem-sucedido:', authData.user?.email)
    }
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Usuário não autenticado')
      return false
    }
    
    // Criar uma imagem de teste (1x1 pixel PNG)
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const imageBuffer = Buffer.from(base64Image, 'base64')
    const testFile = new Blob([imageBuffer], { type: 'image/png' })
    
    const fileName = `${user.id}/test-${Date.now()}.png`
    
    console.log('📤 Fazendo upload...')
    console.log('   Bucket: swipe-file-comments')
    console.log('   Arquivo: ' + fileName)
    console.log('   Tamanho: ' + testFile.size + ' bytes')
    console.log('   Tipo: image/png')
    
    // Tentar fazer upload
    const { data, error } = await supabase.storage
      .from('swipe-file-comments')
      .upload(fileName, testFile, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('\n❌ Erro no upload:', error.message)
      console.error('   Detalhes:', error)
      
      if (error.message?.includes('row-level security')) {
        console.log('\n⚠️  Problema de RLS detectado. Verificando políticas...')
        
        // Listar políticas do bucket
        const { data: policies } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('tablename', 'objects')
          .eq('schemaname', 'storage')
        
        console.log('\nPolíticas encontradas:')
        policies?.forEach(p => {
          console.log(`  - ${p.policyname}`)
        })
      }
      
      return false
    }
    
    console.log('\n✅ Upload bem-sucedido!')
    console.log('   Path: ' + data.path)
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('swipe-file-comments')
      .getPublicUrl(fileName)
    
    console.log('   URL pública: ' + publicUrl)
    
    // Testar se a URL é acessível
    try {
      const response = await fetch(publicUrl)
      if (response.ok) {
        console.log('   ✅ URL acessível publicamente')
      } else {
        console.log('   ⚠️  URL não acessível: HTTP ' + response.status)
      }
    } catch (err) {
      console.log('   ⚠️  Não foi possível verificar a URL')
    }
    
    // Limpar arquivo de teste
    console.log('\n🧹 Limpando arquivo de teste...')
    const { error: deleteError } = await supabase.storage
      .from('swipe-file-comments')
      .remove([fileName])
    
    if (deleteError) {
      console.log('   ⚠️  Não foi possível deletar:', deleteError.message)
    } else {
      console.log('   ✅ Arquivo removido')
    }
    
    return true
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err)
    return false
  }
}

async function checkBucketPolicies() {
  console.log('\n📋 Verificando políticas do bucket...\n')
  
  try {
    // Esta query pode não funcionar se não tivermos acesso
    // Mas vale a pena tentar
    const { data, error } = await supabase
      .rpc('get_storage_policies', { bucket_name: 'swipe-file-comments' })
      .single()
    
    if (error) {
      console.log('⚠️  Não foi possível verificar políticas via RPC')
      console.log('   Acesse o Dashboard do Supabase para verificar manualmente:')
      console.log('   https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/storage/policies')
    } else {
      console.log('Políticas encontradas:', data)
    }
  } catch (err) {
    console.log('⚠️  Verificação de políticas não disponível')
  }
}

async function main() {
  console.log('=================================')
  console.log('   TESTE DE UPLOAD DE IMAGEM')
  console.log('=================================\n')
  console.log(`Projeto: ${supabaseUrl}\n`)
  
  const success = await testImageUpload()
  
  if (!success) {
    await checkBucketPolicies()
    
    console.log('\n=================================')
    console.log('   AÇÃO NECESSÁRIA')
    console.log('=================================\n')
    console.log('1. Verifique se você está logado no app')
    console.log('2. Execute o script SQL 053_fix_storage_bucket.sql no Dashboard')
    console.log('3. Verifique as políticas em:')
    console.log('   https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf/storage/policies')
  } else {
    console.log('\n=================================')
    console.log('   ✅ TESTE CONCLUÍDO COM SUCESSO')
    console.log('=================================')
  }
}

main().catch(console.error)