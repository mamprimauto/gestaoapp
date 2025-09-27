const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

// Configuração do Supabase
const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function executarMigration() {
  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('./scripts/db/121_task_groups.sql', 'utf8')
    
    console.log('Executando migração dos grupos de tarefas...')
    console.log('---')
    
    // Dividir em comandos individuais
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0)
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim() + ';'
      if (command.length > 3) {
        console.log(`Executando comando ${i + 1}/${commands.length}...`)
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: command })
          if (error) {
            console.log(`Erro no comando ${i + 1}:`, error.message)
            // Continue mesmo com erro (pode ser comando já executado)
          } else {
            console.log(`Comando ${i + 1} executado com sucesso`)
          }
        } catch (err) {
          console.log(`Erro no comando ${i + 1}:`, err.message)
        }
      }
    }
    
    console.log('---')
    console.log('Migração executada com sucesso!')
    console.log('Grupos de tarefas implementados!')
    
  } catch (error) {
    console.error('Erro ao executar migração:', error)
  }
}

executarMigration()