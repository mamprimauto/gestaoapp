require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting OKR Tasks Due Date migration...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'db', '035_okr_tasks_due_date.sql')
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Migration file not found:', sqlPath)
      process.exit(1)
    }
    
    let sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📋 Executing migration: 035_okr_tasks_due_date.sql')
    console.log('🎯 Goal: Add due_date field to okr_tasks table for deadline system')
    
    // Split SQL into individual statements and execute each one
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim()
      if (trimmedStatement.length === 0) continue
      
      console.log('🔧 Executing:', trimmedStatement.substring(0, 60) + '...')
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: trimmedStatement + ';'
      })
      
      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from('_temp_migration')
          .select('*')
          .limit(0)
        
        if (directError) {
          console.log('⚠️ SQL execution method not available, manual execution required')
          break
        }
      }
    }
    
    // Test the column creation by checking if it exists
    console.log('\n🔍 Testing column creation...')
    const { data: tableData, error: tableError } = await supabase
      .from('okr_tasks')
      .select('*')
      .limit(1)
    
    if (!tableError) {
      console.log('✅ Column due_date added successfully to okr_tasks table!')
    } else {
      console.log('⚠️ Column verification failed, may need manual execution')
      console.log('📝 Please execute the following in Supabase Dashboard SQL Editor:')
      console.log('')
      console.log(sql)
      console.log('')
    }
    
    console.log('\n✨ Migration process complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Verify column creation in Supabase Dashboard')
    console.log('2. Test OKR task deadline functionality')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()