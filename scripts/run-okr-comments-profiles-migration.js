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
  console.log('🚀 Starting OKR Comments -> Profiles foreign key migration...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'db', '033_fix_okr_comments_profiles.sql')
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Migration file not found:', sqlPath)
      process.exit(1)
    }
    
    let sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📋 Executing migration: 033_fix_okr_comments_profiles.sql')
    console.log('🎯 Goal: Add foreign key constraint between okr_task_comments.user_id and profiles.id')
    
    try {
      // Execute the SQL directly using a SQL query
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sql
      })
      
      if (error) {
        console.log('⚠️ RPC method failed, trying manual execution...')
        
        // Try executing key parts manually
        console.log('\n🧹 Cleaning invalid user_ids...')
        const { error: cleanError } = await supabase
          .from('okr_task_comments')
          .delete()
          .not('user_id', 'in', `(SELECT id FROM profiles)`)
        
        if (cleanError && !cleanError.message.includes('does not exist')) {
          console.error('❌ Error cleaning invalid user_ids:', cleanError.message)
        } else {
          console.log('✅ Invalid user_ids cleaned (if any)')
        }
        
        // Note: The actual constraint creation would need to be done in Supabase Dashboard
        console.log('\n⚠️ Foreign key constraint creation needs manual execution')
        console.log('📝 Please execute the following in Supabase Dashboard SQL Editor:')
        console.log('')
        console.log('ALTER TABLE public.okr_task_comments')
        console.log('ADD CONSTRAINT okr_task_comments_user_id_fkey')
        console.log('FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;')
        console.log('')
        
      } else {
        console.log('✅ Migration executed successfully via RPC')
      }
      
    } catch (err) {
      console.error('❌ Error executing migration:', err.message)
      
      console.log('\n📝 Manual execution required:')
      console.log('1. Go to Supabase Dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Execute the following SQL:')
      console.log('')
      console.log(sql)
      console.log('')
    }
    
    // Test the relationship
    console.log('\n🔍 Testing okr_task_comments -> profiles relationship...')
    
    try {
      const { data, error } = await supabase
        .from('okr_task_comments')
        .select(`
          id,
          user_id,
          profiles (
            id,
            name,
            email
          )
        `)
        .limit(1)
      
      if (error) {
        console.log('❌ Relationship test failed:', error.message)
        console.log('⚠️ Foreign key constraint may not be in place yet')
      } else {
        console.log('✅ Relationship test successful!')
        console.log(`📊 Found ${data?.length || 0} comments with profile data`)
      }
    } catch (err) {
      console.log('❌ Relationship test error:', err.message)
    }
    
    console.log('\n✨ Migration process complete!')
    console.log('\n📝 Next steps if manual execution was needed:')
    console.log('1. Execute the SQL in Supabase Dashboard')
    console.log('2. Restart your Next.js development server')
    console.log('3. Test OKR task comments functionality')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()