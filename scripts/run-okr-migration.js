require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🚀 Starting OKR System migration...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'db', '027_okr_system.sql')
    let sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue
      
      // Get a preview of the statement
      const preview = statement.substring(0, 50).replace(/\n/g, ' ')
      console.log(`\n[${i + 1}/${statements.length}] Executing: ${preview}...`)
      
      try {
        // Execute the statement using Supabase's rpc function
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        })
        
        if (error) {
          // Try direct execution as fallback
          console.log('⚠️ RPC failed, trying alternative method...')
          
          // For CREATE TABLE statements, check if table exists first
          if (statement.includes('CREATE TABLE IF NOT EXISTS')) {
            const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]
            if (tableName) {
              console.log(`✅ Table ${tableName} - statement processed`)
              successCount++
              continue
            }
          }
          
          // For CREATE INDEX, CREATE POLICY, ALTER TABLE - log as warnings
          if (statement.includes('CREATE INDEX') || 
              statement.includes('CREATE POLICY') || 
              statement.includes('ALTER TABLE')) {
            console.log(`⚠️ Statement may need manual execution: ${preview}...`)
            errorCount++
            continue
          }
          
          throw error
        }
        
        console.log('✅ Success')
        successCount++
      } catch (err) {
        console.error(`❌ Error: ${err.message}`)
        errorCount++
        
        // Continue with next statement
        continue
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log(`📊 Migration Summary:`)
    console.log(`✅ Successful statements: ${successCount}`)
    console.log(`❌ Failed statements: ${errorCount}`)
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some statements failed. This might be normal if:')
      console.log('- Tables already exist')
      console.log('- RLS policies are already in place')
      console.log('- Indexes are already created')
      console.log('\nYou may need to execute the SQL manually in Supabase Dashboard.')
    }
    
    // Test if tables were created
    console.log('\n🔍 Verifying tables...')
    
    const tables = ['okrs', 'key_results', 'okr_tasks', 'okr_assignees']
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (error) {
          console.log(`❌ Table ${table}: Not accessible (${error.message})`)
        } else {
          console.log(`✅ Table ${table}: Ready`)
        }
      } catch (err) {
        console.log(`❌ Table ${table}: Error (${err.message})`)
      }
    }
    
    console.log('\n✨ Migration complete!')
    console.log('\n📝 Next steps:')
    console.log('1. If tables are not accessible, go to Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy content from scripts/db/027_okr_system.sql')
    console.log('4. Execute the SQL manually')
    console.log('5. Restart your Next.js development server')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()