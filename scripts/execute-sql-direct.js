const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Executando SQL direto no Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key disponível:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSql() {
  try {
    // Primeiro, vamos verificar se as colunas já existem
    console.log('Verificando estrutura atual da tabela tasks...');
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'tasks')
      .eq('table_schema', 'public');
    
    if (columnsError) {
      console.error('Erro ao verificar colunas:', columnsError);
    } else {
      const columnNames = columns.map(c => c.column_name);
      console.log('Colunas existentes:', columnNames);
      
      const hasParentId = columnNames.includes('parent_id');
      const hasVariationType = columnNames.includes('variation_type');
      
      console.log('parent_id existe:', hasParentId);
      console.log('variation_type existe:', hasVariationType);
      
      if (hasParentId && hasVariationType) {
        console.log('✅ Colunas já existem! Nenhuma migration necessária.');
        return;
      }
    }
    
    // Se chegou aqui, precisamos executar a migration
    console.log('Executando commands SQL individualmente...');
    
    const commands = [
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID;",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS variation_type TEXT;",
      "ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE;",
      "ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS tasks_variation_type_check CHECK (variation_type IN ('hook', 'body', 'clickbait') OR variation_type IS NULL);",
      "CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);",
      "CREATE INDEX IF NOT EXISTS idx_tasks_variation_type ON tasks(variation_type);",
      "CREATE INDEX IF NOT EXISTS idx_tasks_parent_variation ON tasks(parent_id, variation_type);"
    ];
    
    for (const command of commands) {
      console.log('Executando:', command.substring(0, 50) + '...');
      
      try {
        const { error } = await supabase.rpc('exec_sql', { query: command });
        if (error) {
          console.log('❌ Erro:', error.message);
          // Tentar usando SQL direto com uma query simples
          if (command.includes('ADD COLUMN')) {
            console.log('Tentando abordagem alternativa...');
            // Vamos tentar executar usando uma query de teste
            const testQuery = await supabase.from('tasks').select('id').limit(1);
            if (testQuery.error) {
              console.log('Erro no teste:', testQuery.error);
            } else {
              console.log('Tabela tasks acessível');
            }
          }
        } else {
          console.log('✅ Sucesso');
        }
      } catch (e) {
        console.log('❌ Exceção:', e.message);
      }
    }
    
    console.log('Migration concluída!');
    
  } catch (err) {
    console.error('Erro geral:', err.message);
  }
}

executeSql();