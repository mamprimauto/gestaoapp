const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimpleMigration() {
  console.log('🚀 Executando migração simples de múltiplos assignees...');
  
  try {
    // 1. Primeiro, vamos criar a tabela task_assignees
    console.log('\n1️⃣ Criando tabela task_assignees...');
    
    const { data: createTableResult, error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS task_assignees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          assignee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(task_id, assignee_id)
        );
      `
    });
    
    if (createError) {
      console.log('❌ Erro ao criar tabela:', createError.message);
    } else {
      console.log('✅ Tabela task_assignees criada');
    }
    
    // 2. Migrar dados existentes
    console.log('\n2️⃣ Migrando dados existentes...');
    
    // Buscar tarefas com assignee_id
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, assignee_id')
      .not('assignee_id', 'is', null);
      
    if (tasksError) {
      console.log('❌ Erro ao buscar tarefas:', tasksError.message);
    } else {
      console.log(`📋 Encontradas ${tasks.length} tarefas com assignees`);
      
      // Inserir na nova tabela
      for (const task of tasks) {
        const { error: insertError } = await supabase
          .from('task_assignees')
          .upsert({
            task_id: task.id,
            assignee_id: task.assignee_id
          });
          
        if (insertError) {
          console.log(`⚠️ Erro ao migrar tarefa ${task.id}:`, insertError.message);
        }
      }
      
      console.log('✅ Dados migrados para task_assignees');
    }
    
    // 3. Testar funcionalidade
    console.log('\n3️⃣ Testando funcionalidade...');
    
    const { data: testData, error: testError } = await supabase
      .from('task_assignees')
      .select('*')
      .limit(5);
      
    if (testError) {
      console.log('❌ Erro ao testar:', testError.message);
    } else {
      console.log(`✅ Tabela funcionando - ${testData.length} registros encontrados`);
    }
    
    console.log('\n🎉 Migração concluída!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Atualizar componentes para usar a nova estrutura');
    console.log('2. Permitir múltiplos assignees na UI');
    console.log('3. Mostrar quem criou cada tarefa');
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error.message);
  }
}

runSimpleMigration();