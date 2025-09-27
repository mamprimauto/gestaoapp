const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMultiAssigneeMigration() {
  console.log('🚀 Executando migração de múltiplos assignees...');
  
  try {
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'db', '070_multi_assignee_support.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Dividir em comandos separados (split por ';' mas cuidado com ; dentro de strings)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
      .map(cmd => cmd + ';');
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim().length < 10) continue; // Skip very short commands
      
      console.log(`\n[${i + 1}/${commands.length}] Executando comando...`);
      console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { query: command });
        
        if (error) {
          console.log(`⚠️  Aviso: ${error.message}`);
        } else {
          console.log('✅ Sucesso');
        }
      } catch (err) {
        console.log(`ℹ️  Info: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Migração concluída!');
    console.log('\n📊 Testando as novas estruturas...');
    
    // Testar se as tabelas foram criadas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'task_assignees');
      
    if (tablesError) {
      console.log('❌ Erro ao verificar tabelas:', tablesError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabela task_assignees criada com sucesso');
      
      // Testar a view
      const { data: viewTest, error: viewError } = await supabase
        .from('tasks_with_assignees')
        .select('id, created_by_name, assignees')
        .limit(1);
        
      if (viewError) {
        console.log('❌ Erro ao testar view:', viewError.message);
      } else {
        console.log('✅ View tasks_with_assignees funcionando');
      }
    } else {
      console.log('❌ Tabela task_assignees não foi criada');
    }
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error.message);
    process.exit(1);
  }
}

runMultiAssigneeMigration();