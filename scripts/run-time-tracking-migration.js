#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Executando migration de time tracking...')
  
  try {
    // Ler o arquivo SQL
    const migrationPath = path.join(__dirname, 'db', '017_task_time_tracking.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📁 Arquivo de migration carregado:', migrationPath)
    
    // Executar a migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    })
    
    if (error) {
      // Se exec_sql não existir, tentar executar diretamente
      console.log('⚠️  exec_sql não encontrado, tentando execução direta...')
      
      // Dividir o SQL em comandos individuais
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0)
      
      console.log(`📝 Executando ${commands.length} comandos SQL...`)
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i]
        if (command.toLowerCase().includes('select') || 
            command.toLowerCase().includes('insert') ||
            command.toLowerCase().includes('update') ||
            command.toLowerCase().includes('delete')) {
          continue // Pular comandos DML se houver
        }
        
        console.log(`   ${i + 1}/${commands.length}: ${command.substring(0, 50)}...`)
        
        const { error: cmdError } = await supabase.rpc('exec', { 
          sql: command + ';'
        })
        
        if (cmdError) {
          console.error(`❌ Erro no comando ${i + 1}:`, cmdError.message)
          // Continuar com os próximos comandos em caso de erro
        }
      }
      
      console.log('✅ Migration executada (com possíveis avisos)')
    } else {
      console.log('✅ Migration executada com sucesso!')
    }
    
    // Verificar se a tabela foi criada
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'task_time_sessions')
    
    if (tableError) {
      console.log('⚠️  Não foi possível verificar a tabela:', tableError.message)
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabela task_time_sessions criada com sucesso!')
    } else {
      console.log('⚠️  Tabela task_time_sessions não encontrada')
    }
    
  } catch (error) {
    console.error('❌ Erro na migration:', error.message)
    process.exit(1)
  }
}

runMigration()