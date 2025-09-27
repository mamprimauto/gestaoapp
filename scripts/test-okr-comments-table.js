const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://bwxxtqnxgwkdtahkmjmy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3eHh0cW54Z3drZHRhaGttam15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU0MTcwOCwiZXhwIjoyMDUwMTE3NzA4fQ.hTKglJNGt8ZBW3PQ6-e7nP6F9PlWHW-lbfNP4WGLsWc';

async function testOKRCommentsTable() {
  console.log('🧪 Testando conexão com tabela okr_task_comments...');

  // Criar cliente admin
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    // Testar se a tabela okr_task_checklist existe (que sabemos que funciona)
    console.log('✅ Testando okr_task_checklist...');
    const { data: checklistTest, error: checklistError } = await supabase
      .from('okr_task_checklist')
      .select('*')
      .limit(1);
    
    if (checklistError) {
      console.log('❌ Erro na tabela okr_task_checklist:', checklistError.message);
    } else {
      console.log('✅ Tabela okr_task_checklist funciona - registros:', checklistTest?.length || 0);
    }

    // Testar se a tabela okr_task_comments existe
    console.log('📝 Testando okr_task_comments...');
    const { data: commentsTest, error: commentsError } = await supabase
      .from('okr_task_comments')
      .select('*')
      .limit(1);
    
    if (commentsError) {
      console.log('❌ Erro na tabela okr_task_comments:', commentsError.message);
      console.log('❌ Código do erro:', commentsError.code);
      console.log('❌ Detalhes:', commentsError.details);
    } else {
      console.log('✅ Tabela okr_task_comments funciona - registros:', commentsTest?.length || 0);
    }

    // Testar se a tabela okr_tasks existe
    console.log('🎯 Testando okr_tasks...');
    const { data: tasksTest, error: tasksError } = await supabase
      .from('okr_tasks')
      .select('id, title')
      .limit(5);
    
    if (tasksError) {
      console.log('❌ Erro na tabela okr_tasks:', tasksError.message);
    } else {
      console.log('✅ Tabela okr_tasks funciona - registros:', tasksTest?.length || 0);
      if (tasksTest && tasksTest.length > 0) {
        console.log('📋 Primeira tarefa:', tasksTest[0]);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testOKRCommentsTable();