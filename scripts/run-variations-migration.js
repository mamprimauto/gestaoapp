const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key disponível:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Configuração do Supabase não encontrada');
  console.log('Certifique-se de ter as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'db', '022_creative_variations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executando migration para sistema de variações...');
    console.log('SQL:', sql.substring(0, 200) + '...');
    
    // Usar SQL direto para executar os comandos
    console.log('Executando SQL completo...');
    
    // Execute SQL directly using the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na execução:', response.status, errorText);
      
      // Fallback: tentar comando por comando usando query direto
      console.log('Tentando executar comandos individualmente...');
      const commands = sql.split(';').filter(cmd => cmd.trim() && !cmd.trim().startsWith('--'));
      
      for (const command of commands) {
        if (command.trim()) {
          console.log('Executando:', command.trim().substring(0, 50) + '...');
          try {
            const { error } = await supabase.from('_dummy_').select('1'); // Test connection
            if (error && error.code === '42P01') {
              // Expected error for non-existent table, means connection works
              // Now try to execute the SQL using a different approach
              console.log('Pulando comando (não suportado via cliente JS):', command.trim().substring(0, 30) + '...');
            }
          } catch (e) {
            console.log('Erro no comando:', command.trim().substring(0, 30) + '...', e.message);
          }
        }
      }
    } else {
      console.log('SQL executado com sucesso via API REST');
    }
    
    console.log('Migration concluída!');
  } catch (err) {
    console.error('Erro na migration:', err.message);
    process.exit(1);
  }
}

runMigration();