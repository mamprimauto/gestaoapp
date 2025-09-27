const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔧 Fixing storage policies for avatars bucket...');
    
    const sqlPath = path.join(__dirname, 'db', '073_fix_storage_avatars_policies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar cada statement separadamente
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        
        // Para comandos SQL, precisamos usar o método RPC com raw SQL
        // Como não temos exec_sql, vamos usar o cliente admin diretamente
        try {
          // Usar o Supabase SQL Editor endpoint se disponível
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              sql_query: statement + ';'
            })
          });
          
          if (!response.ok) {
            // Se exec_sql não existir, tentar método alternativo
            console.log('exec_sql not available, using alternative method');
            
            // Para políticas de storage, precisamos usar a API de admin diretamente
            if (statement.includes('storage.objects')) {
              console.log('⚠️ Storage policies need to be configured in Supabase Dashboard');
              console.log('Please run the following SQL in Supabase SQL Editor:');
              console.log('---');
              console.log(statement + ';');
              console.log('---');
            }
          }
        } catch (error) {
          console.log('Statement execution note:', error.message);
        }
      }
    }
    
    console.log('');
    console.log('📝 Important: Storage policies must be configured in Supabase Dashboard');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Run the contents of scripts/db/073_fix_storage_avatars_policies.sql');
    console.log('');
    console.log('Alternative: Use the Supabase CLI:');
    console.log('   supabase db push --db-url="YOUR_DATABASE_URL"');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();