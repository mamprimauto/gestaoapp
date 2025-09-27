const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuração do Supabase
const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function createTaskGroups() {
  try {
    console.log('Verificando se a tabela task_groups já existe...')
    
    // Primeiro, vamos verificar se a tabela já existe
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'task_groups')
    
    if (tablesError) {
      console.log('Erro ao verificar tabelas:', tablesError.message)
      console.log('Tentando criar tabela mesmo assim...')
    } else if (tables && tables.length > 0) {
      console.log('Tabela task_groups já existe!')
      return
    }
    
    console.log('Criando tabela task_groups...')
    
    // Vamos executar comandos SQL mais básicos
    console.log('1. Criando a tabela task_groups...')
    
    // Executar via SQL direto no postgREST
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.task_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        color text DEFAULT '#3b82f6',
        icon text DEFAULT 'folder',
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `
    
    try {
      // Usar uma query raw via SQL
      const response = await fetch(`${url}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        },
        body: JSON.stringify({ sql: createTableQuery })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      console.log('Tabela criada com sucesso!')
      
    } catch (error) {
      console.log('Erro ao criar tabela:', error.message)
      console.log('Tentando abordagem alternativa...')
      
      // Se falhar, vamos tentar criar um registro para ativar a tabela
      try {
        const { data, error } = await supabase
          .from('task_groups')
          .select('*')
          .limit(1)
        
        if (error && error.message.includes('relation "public.task_groups" does not exist')) {
          console.log('Confirmado: tabela não existe. Precisa ser criada via SQL Console do Supabase.')
          console.log('\nPor favor, acesse o Supabase Dashboard > SQL Editor e execute:')
          console.log('---')
          console.log(createTableQuery)
          console.log('---')
          return
        }
        
        console.log('Tabela task_groups já existe e funcionando!')
        
      } catch (err) {
        console.log('Erro ao verificar tabela:', err.message)
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error)
  }
}

createTaskGroups()