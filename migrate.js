const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename) {
  try {
    console.log(`Running migration: ${filename}`);
    
    const sqlContent = fs.readFileSync(path.join(__dirname, 'scripts/db', filename), 'utf8');
    
    // Split SQL into individual statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error('Migration error:', error);
          return false;
        }
      }
    }
    
    console.log(`✅ Migration ${filename} completed successfully`);
    return true;
    
  } catch (error) {
    console.error(`Migration ${filename} failed:`, error);
    return false;
  }
}

async function main() {
  console.log('Starting database migrations...');
  
  // Run migrations in order
  const migrations = [
    '084_separate_ad_investments.sql',
    '085_separate_chargeback_refund.sql'
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error('Migration failed, stopping...');
      process.exit(1);
    }
  }
  
  console.log('✅ All migrations completed successfully!');
  process.exit(0);
}

main().catch(console.error);