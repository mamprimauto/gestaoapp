const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=====================================');
console.log('🚀 Script de Migration de Variações');
console.log('=====================================');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key disponível:', !!supabaseKey);
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Configuração do Supabase não encontrada');
  console.log('');
  console.log('Verifique se o arquivo .env.local contém:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function checkIfMigrationNeeded() {
  console.log('🔍 Verificando se a migration já foi aplicada...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/tasks?select=parent_id,variation_type&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Migration já foi aplicada! As colunas já existem.');
      return false;
    } else if (response.status === 400) {
      const error = await response.text();
      if (error.includes('column') && (error.includes('parent_id') || error.includes('variation_type'))) {
        console.log('📝 Migration necessária. As colunas ainda não existem.');
        return true;
      }
    }
    
    return true;
  } catch (err) {
    console.log('⚠️  Não foi possível verificar o status da migration:', err.message);
    return true;
  }
}

async function applyMigrationViaSupabaseAPI() {
  console.log('');
  console.log('🔧 Aplicando migration via Supabase SQL Editor API...');
  console.log('');
  
  // Ler o arquivo SQL
  const sqlPath = path.join(__dirname, 'db', '022_creative_variations.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('📄 SQL a ser executado:');
  console.log('----------------------------------------');
  console.log(sql);
  console.log('----------------------------------------');
  console.log('');
  
  console.log('⚠️  IMPORTANTE: Este script não pode executar DDL (ALTER TABLE) diretamente.');
  console.log('');
  console.log('Para aplicar a migration, você precisa:');
  console.log('');
  console.log('1. Acessar o Supabase Dashboard:');
  console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.com/project/dpajrkohmqdbskqbimqf')}/sql`);
  console.log('');
  console.log('2. Colar e executar o SQL acima no SQL Editor');
  console.log('');
  console.log('3. Ou executar via Supabase CLI:');
  console.log('   supabase db push --db-url "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"');
  console.log('');
  
  // Salvar o SQL em um arquivo local para facilitar
  const outputPath = path.join(process.cwd(), 'apply-variations-migration.sql');
  fs.writeFileSync(outputPath, sql);
  console.log(`✅ SQL salvo em: ${outputPath}`);
  console.log('   Você pode copiar este arquivo e colar no Supabase Dashboard.');
}

async function runMigration() {
  try {
    const needsMigration = await checkIfMigrationNeeded();
    
    if (!needsMigration) {
      console.log('');
      console.log('✨ Tudo pronto! Não há nada para fazer.');
      return;
    }
    
    await applyMigrationViaSupabaseAPI();
    
  } catch (err) {
    console.error('');
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
  }
}

// Executar
runMigration();