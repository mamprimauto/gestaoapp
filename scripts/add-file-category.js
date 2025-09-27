// Quick script to add file_category column using Supabase client
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function addFileCategoryColumn() {
  console.log('Adding file_category column to task_files table...')
  
  try {
    // Execute the SQL migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add file_category column if it doesn't exist
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'task_files' 
            AND column_name = 'file_category'
          ) THEN
            ALTER TABLE public.task_files ADD COLUMN file_category text DEFAULT 'general';
            CREATE INDEX IF NOT EXISTS task_files_category_idx ON public.task_files(task_id, file_category);
          END IF;
        END $$;
      `
    })
    
    if (error) {
      // If rpc doesn't exist, try direct SQL execution
      console.log('RPC method not available, trying direct SQL...')
      
      // Check if column exists first
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'task_files')
        .eq('column_name', 'file_category')
        
      if (columnError) {
        throw new Error(`Failed to check column existence: ${columnError.message}`)
      }
      
      if (columns && columns.length === 0) {
        console.log('Column does not exist, will add via SQL execution in app...')
        console.log('Please run this SQL manually in your Supabase SQL editor:')
        console.log(`
ALTER TABLE public.task_files 
ADD COLUMN file_category text DEFAULT 'general';

CREATE INDEX IF NOT EXISTS task_files_category_idx 
ON public.task_files(task_id, file_category);
        `)
      } else {
        console.log('✓ file_category column already exists')
      }
    } else {
      console.log('✓ Migration completed successfully')
    }
  } catch (error) {
    console.error('Migration failed:', error.message)
    console.log('Please run this SQL manually in your Supabase SQL editor:')
    console.log(`
ALTER TABLE public.task_files 
ADD COLUMN IF NOT EXISTS file_category text DEFAULT 'general';

CREATE INDEX IF NOT EXISTS task_files_category_idx 
ON public.task_files(task_id, file_category);
    `)
  }
}

addFileCategoryColumn().catch(console.error)