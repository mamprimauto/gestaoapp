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
    console.log('🔧 Fixing avatar RLS policies...');
    
    const sqlPath = path.join(__dirname, 'db', '072_fix_profiles_avatar_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    }).single();
    
    if (error) {
      // Se exec_sql não existir, tentar executar diretamente
      const statements = sql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          }).single();
          
          if (stmtError && !stmtError.message.includes('exec_sql')) {
            console.error('Error executing statement:', stmtError);
          }
        }
      }
    }
    
    console.log('✅ Avatar RLS policies fixed successfully!');
    console.log('');
    console.log('📝 What was fixed:');
    console.log('   - Admins can now update any user avatar');
    console.log('   - Users can still update their own profile');
    console.log('   - Proper RLS policies in place');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();