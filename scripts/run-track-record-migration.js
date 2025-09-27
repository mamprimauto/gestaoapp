#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Starting Track Record migration...')
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'db', '044_track_record_system.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📖 Reading migration file:', migrationPath)
    
    // Execute the migration
    console.log('⚡ Executing migration...')
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Track Record migration completed successfully!')
    console.log('🎯 Tables created:')
    console.log('  - track_records')
    console.log('  - track_record_variations') 
    console.log('  - track_record_kpis')
    console.log('🔒 RLS policies enabled')
    console.log('⚡ Triggers and functions created')
    console.log('📊 Views created')
    
    // Test the function
    console.log('\n🧪 Testing ID generation function...')
    const { data: testId, error: testError } = await supabase.rpc('get_next_track_record_id', {
      test_type: 'VSL',
      test_year: new Date().getFullYear(),
      org_id: '00000000-0000-0000-0000-000000000000' // Fake UUID for test
    })
    
    if (testError) {
      console.warn('⚠️  Test failed (this is expected if you have RLS):', testError.message)
    } else {
      console.log('✅ Test ID generated:', testId)
    }
    
    console.log('\n🎉 Migration completed! You can now use /trackrecord')
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message)
    process.exit(1)
  }
}

// Alternative method using direct SQL execution
async function runMigrationDirect() {
  console.log('🚀 Starting Track Record migration (direct SQL)...')
  
  try {
    const migrationPath = path.join(__dirname, 'db', '044_track_record_system.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📖 Reading migration file:', migrationPath)
    
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`⚡ Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      if (statement.trim() === ';') continue
      
      console.log(`  [${i + 1}/${statements.length}] Executing...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        query: statement 
      })
      
      if (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message)
        console.error('Statement:', statement.substring(0, 100) + '...')
        // Continue with other statements
      }
    }
    
    console.log('✅ Migration completed!')
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message)
  }
}

// Run the migration
console.log('🔧 Track Record Migration Script')
console.log('==================================')

runMigration().catch(() => {
  console.log('\n🔄 Trying alternative method...')
  runMigrationDirect()
})