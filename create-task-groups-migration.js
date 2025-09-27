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
    
    // Executar cada comando SQL individualmente
    const commands = [
      // Criar tabela task_groups
      `CREATE TABLE IF NOT EXISTS public.task_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        color text DEFAULT '#3b82f6',
        icon text DEFAULT 'folder',
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, position)
      )`,
      
      // Criar índices
      `CREATE INDEX IF NOT EXISTS task_groups_user_id_idx ON public.task_groups(user_id)`,
      `CREATE INDEX IF NOT EXISTS task_groups_position_idx ON public.task_groups(user_id, position)`,
      
      // Habilitar RLS
      `ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY`,
      
      // Adicionar coluna group_id na tabela tasks
      `ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.task_groups(id) ON DELETE SET NULL`,
      
      // Criar índice para group_id
      `CREATE INDEX IF NOT EXISTS tasks_group_id_idx ON public.tasks(group_id)`
    ]
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim()
      if (command.length > 0) {
        console.log(`Executando comando ${i + 1}/${commands.length}...`)
        try {
          const { data, error } = await supabase
            .rpc('exec', { sql: command })
          
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
    console.log('Migração básica executada!')
    console.log('Agora executando criação de políticas RLS...')
    
    // Criar políticas RLS manualmente
    const policies = [
      {
        name: 'task_groups_select_own',
        table: 'task_groups',
        operation: 'SELECT',
        check: 'auth.uid() = user_id'
      },
      {
        name: 'task_groups_insert_own', 
        table: 'task_groups',
        operation: 'INSERT',
        check: 'auth.uid() = user_id'
      },
      {
        name: 'task_groups_update_own',
        table: 'task_groups', 
        operation: 'UPDATE',
        check: 'auth.uid() = user_id'
      },
      {
        name: 'task_groups_delete_own',
        table: 'task_groups',
        operation: 'DELETE', 
        check: 'auth.uid() = user_id'
      }
    ]
    
    for (const policy of policies) {
      try {
        console.log(`Criando política ${policy.name}...`)
        
        // Primeiro tentar remover se existir
        await supabase.rpc('exec', { 
          sql: `DROP POLICY IF EXISTS "${policy.name}" ON public.${policy.table}` 
        })
        
        // Criar a política
        const policySQL = `CREATE POLICY "${policy.name}" ON public.${policy.table} FOR ${policy.operation} USING (${policy.check})`
        if (policy.operation === 'INSERT') {
          policySQL = `CREATE POLICY "${policy.name}" ON public.${policy.table} FOR ${policy.operation} WITH CHECK (${policy.check})`
        }
        
        const { error } = await supabase.rpc('exec', { sql: policySQL })
        
        if (error) {
          console.log(`Erro ao criar política ${policy.name}:`, error.message)
        } else {
          console.log(`Política ${policy.name} criada com sucesso`)
        }
      } catch (err) {
        console.log(`Erro ao criar política ${policy.name}:`, err.message)
      }
    }
    
    console.log('---')
    console.log('Migração finalizada!')
    
  } catch (error) {
    console.error('Erro ao executar migração:', error)
  }
}

executarMigration()