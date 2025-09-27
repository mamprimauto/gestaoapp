const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://bwxxtqnxgwkdtahkmjmy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3eHh0cW54Z3drZHRhaGttam15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU0MTcwOCwiZXhwIjoyMDUwMTE3NzA4fQ.hTKglJNGt8ZBW3PQ6-e7nP6F9PlWHW-lbfNP4WGLsWc';

async function runMigration() {
  console.log('🚀 Iniciando migração de OKR task details...');

  // Criar cliente admin
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'db', '032_okr_task_details.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executando SQL...');

    // Dividir comandos SQL (separar por linhas em branco duplas)
    const commands = sqlContent
      .split('\n\n')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.length > 0) {
        console.log(`📝 Executando comando ${i + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: command 
        });

        if (error) {
          // Tentar execução direta se RPC falhar
          try {
            await supabase.from('_temp_migration').select('1').limit(1);
          } catch {
            // Se falhar, usar método alternativo
            console.log('⚠️  RPC indisponível, tentando método alternativo...');
            console.log('📤 Execute este SQL manualmente no Supabase:');
            console.log('-----------------------------------');
            console.log(sqlContent);
            console.log('-----------------------------------');
            return;
          }
          
          if (error.message.includes('already exists') || error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`⚠️  Tabela já existe: ${error.message}`);
          } else {
            throw error;
          }
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
        }
      }
    }

    console.log('✅ Migração concluída com sucesso!');

    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const { data: checklistTable } = await supabase
      .from('okr_task_checklist')
      .select('*')
      .limit(1);
    
    const { data: commentsTable } = await supabase
      .from('okr_task_comments')
      .select('*')
      .limit(1);

    console.log('📊 Verificação das tabelas:');
    console.log(`   - okr_task_checklist: ${checklistTable !== undefined ? '✅ OK' : '❌ ERRO'}`);
    console.log(`   - okr_task_comments: ${commentsTable !== undefined ? '✅ OK' : '❌ ERRO'}`);

  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    
    // Se falhar, mostrar o SQL para execução manual
    console.log('\n📤 Execute este SQL manualmente no Supabase Dashboard:');
    console.log('='.repeat(50));
    const sqlPath = path.join(__dirname, 'db', '032_okr_task_details.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(sqlContent);
    console.log('='.repeat(50));
  }
}

runMigration();