// Simple script to run database migrations
const { exec } = require('child_process');

console.log('Conecte-se ao Supabase e execute as seguintes queries SQL:');
console.log('');
console.log('1. Adicionar colunas para investimentos separados:');
console.log('ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_google_ads DECIMAL(10,2) DEFAULT 0;');
console.log('ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_facebook DECIMAL(10,2) DEFAULT 0;');
console.log('ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_tiktok DECIMAL(10,2) DEFAULT 0;');
console.log('');
console.log('2. Adicionar colunas para chargebacks e reembolsos separados:');
console.log('ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS chargebacks DECIMAL(10,2) DEFAULT 0;');
console.log('ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS reembolsos DECIMAL(10,2) DEFAULT 0;');
console.log('');
console.log('3. Atualizar função trigger (cole o SQL completo do arquivo apply-migrations.sql)');

// As an alternative, let's try to use supabase client
const { createClient } = require('@supabase/supabase-js');

// Check if we can load env
try {
  require('dotenv').config({ path: '.env.local' });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    console.log('\nUsando Supabase client para aplicar migrações...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    async function runMigrations() {
      // Add the new columns first
      const alterQueries = [
        'ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_google_ads DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_facebook DECIMAL(10,2) DEFAULT 0', 
        'ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS investimento_tiktok DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS chargebacks DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE internal_financial_data ADD COLUMN IF NOT EXISTS reembolsos DECIMAL(10,2) DEFAULT 0'
      ];
      
      for (const query of alterQueries) {
        try {
          console.log(`Executando: ${query.substring(0, 50)}...`);
          const result = await supabase.rpc('exec_sql', { query });
          if (result.error) {
            console.log(`Aviso: ${result.error.message}`);
          }
        } catch (err) {
          console.log(`Info: ${err.message}`);
        }
      }
      
      console.log('\n✅ Colunas adicionadas com sucesso!');
      console.log('Agora você pode testar a aplicação.');
    }
    
    runMigrations().catch(console.error);
  }
} catch (err) {
  console.error('Erro ao carregar variáveis de ambiente:', err.message);
}