#!/usr/bin/env node

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Verificar se as variáveis de ambiente estão configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  console.log('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🚀 Executando migration para creative_products...\n')
  
  const migrationPath = path.join(__dirname, 'db', '014_creative_products.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Arquivo de migration não encontrado:', migrationPath)
    process.exit(1)
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  try {
    // Executar a migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).single()
    
    if (error) {
      // Se o erro for que a função não existe, tentar executar diretamente
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        console.log('⚠️  Função exec_sql não disponível, tentando método alternativo...')
        
        // Criar tabela manualmente usando queries individuais
        // Nota: Em produção, você deve executar a migration diretamente no painel Supabase
        console.log('\n📋 INSTRUÇÕES PARA EXECUTAR A MIGRATION:')
        console.log('1. Acesse o painel do Supabase')
        console.log('2. Vá para SQL Editor')
        console.log('3. Cole e execute o seguinte SQL:\n')
        console.log('----------------------------------------')
        console.log(migrationSQL)
        console.log('----------------------------------------\n')
        console.log('✅ Depois de executar, os produtos dinâmicos estarão disponíveis!')
        
        return
      }
      
      throw error
    }
    
    console.log('✅ Migration executada com sucesso!')
    console.log('✅ Tabela creative_products criada!')
    console.log('✅ Políticas RLS configuradas!')
    console.log('✅ Triggers criados!')
    
    // Inicializar produtos padrão
    console.log('\n📦 Inicializando produtos padrão...')
    
    const defaultProducts = [
      {
        name: 'Memo Master',
        description: 'App de memorização e estudos inteligentes',
        color: '#007AFF',
        bg_gradient: 'from-blue-500 to-blue-600',
        icon: '🧠',
        nomenclature: {
          prefixo_oferta: 'MM',
          numeracao_inicial: 1,
          iniciais_copy_padrao: 'AUTO',
          iniciais_editor_padrao: 'AUTO',
          fonte_trafego_padrao: 'FB'
        }
      },
      {
        name: 'Youtasky',
        description: 'Gerenciador de tarefas para YouTubers',
        color: '#FF453A',
        bg_gradient: 'from-red-500 to-red-600',
        icon: '📹',
        nomenclature: {
          prefixo_oferta: 'YT',
          numeracao_inicial: 1,
          iniciais_copy_padrao: 'AUTO',
          iniciais_editor_padrao: 'AUTO',
          fonte_trafego_padrao: 'FB'
        }
      },
      {
        name: 'Alma Gêmea',
        description: 'Plataforma de relacionamentos autênticos',
        color: '#FF2D92',
        bg_gradient: 'from-pink-500 to-pink-600',
        icon: '💖',
        nomenclature: {
          prefixo_oferta: 'AG',
          numeracao_inicial: 1,
          iniciais_copy_padrao: 'AUTO',
          iniciais_editor_padrao: 'AUTO',
          fonte_trafego_padrao: 'FB'
        }
      }
    ]
    
    // Verificar se já existem produtos
    const { data: existing } = await supabase
      .from('creative_products')
      .select('id')
      .limit(1)
    
    if (!existing || existing.length === 0) {
      // Inserir produtos padrão
      const { error: insertError } = await supabase
        .from('creative_products')
        .insert(defaultProducts)
      
      if (insertError) {
        console.error('⚠️  Erro ao inserir produtos padrão:', insertError.message)
      } else {
        console.log('✅ Produtos padrão criados com sucesso!')
      }
    } else {
      console.log('ℹ️  Produtos já existem no banco de dados')
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message)
    process.exit(1)
  }
}

// Executar
runMigration()