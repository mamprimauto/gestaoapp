const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Configuração do Supabase
require('dotenv').config()
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function executarSQL() {
  try {
    // Pegar arquivo SQL da linha de comando ou usar padrão
    const sqlFile = process.argv[2] || './scripts/db/093_estruturas_comments_system.sql'

    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync(sqlFile, 'utf8')

    console.log(`Executando arquivo: ${sqlFile}`)
    
    console.log('Executando SQL...')
    console.log('---')
    
    // Dividir em comandos individuais (aproximadamente)
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
    console.log('Script executado!')
    
  } catch (error) {
    console.error('Erro ao executar SQL:', error)
  }
}

executarSQL()