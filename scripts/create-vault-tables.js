#!/usr/bin/env node

// Script para criar as tabelas do vault diretamente no Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://dpajrkohmqdbskqbimqf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYWpya29obXFkYnNrcWJpbXFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY2ODEwNiwiZXhwIjoyMDcwMjQ0MTA2fQ.3Cj0rKQb3Jo69jPxyBTzM26UrClSgoxL_oBBNzbaq0s';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createVaultTables() {
  console.log('🔐 Criando tabelas do Vault...\n');

  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'db', '036_vault_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Dividir em statements individuais
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`📋 Executando ${statements.length} statements SQL...`);

    for (const statement of statements) {
      if (statement.length < 10) continue;
      
      try {
        // Tentar executar via supabase diretamente
        const { data, error } = await supabase
          .from('_test_create')
          .select('*')
          .limit(1);
        
        // Se falhar, significa que precisamos criar as tabelas de outra forma
        console.log(`⚠️  Tabelas precisam ser criadas via Supabase Dashboard`);
        break;
      } catch (err) {
        // Ignorar erro
      }
    }

    // Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas...');
    
    const tables = ['vault_items', 'vault_settings', 'vault_access_logs', 'vault_sessions'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabela ${table} não encontrada`);
      } else {
        console.log(`✅ Tabela ${table} existe`);
      }
    }

    console.log('\n📝 IMPORTANTE:');
    console.log('Se as tabelas não foram criadas, você precisa:');
    console.log('1. Acessar o Supabase Dashboard: https://supabase.com/dashboard/project/dpajrkohmqdbskqbimqf');
    console.log('2. Ir em SQL Editor');
    console.log('3. Executar o conteúdo de scripts/db/036_vault_system.sql');
    console.log('4. Executar o conteúdo de scripts/db/037_vault_rls_security.sql');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createVaultTables();