/**
 * Script para limpar sessões ativas órfãs que podem estar causando o problema das 43 horas
 * Execute uma vez para corrigir dados existentes
 */

const { createClient } = require('@supabase/supabase-js');

async function cleanupActiveSessions() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    console.log('🔍 Buscando sessões ativas...');
    
    // Buscar todas as sessões ativas
    const { data: activeSessions, error: fetchError } = await supabase
      .from('task_time_sessions')
      .select('id, task_id, user_id, start_time')
      .is('end_time', null);

    if (fetchError) {
      console.error('❌ Erro ao buscar sessões:', fetchError);
      return;
    }

    console.log(`📊 Encontradas ${activeSessions.length} sessões ativas`);

    if (activeSessions.length === 0) {
      console.log('✅ Nenhuma sessão ativa encontrada');
      return;
    }

    // Agrupar por task_id para identificar tarefas com múltiplas sessões ativas
    const sessionsByTask = {};
    activeSessions.forEach(session => {
      if (!sessionsByTask[session.task_id]) {
        sessionsByTask[session.task_id] = [];
      }
      sessionsByTask[session.task_id].push(session);
    });

    // Identificar tarefas com múltiplas sessões ativas
    const tasksWithMultipleSessions = Object.entries(sessionsByTask)
      .filter(([taskId, sessions]) => sessions.length > 1);

    console.log(`🚨 Tarefas com múltiplas sessões ativas: ${tasksWithMultipleSessions.length}`);

    for (const [taskId, sessions] of tasksWithMultipleSessions) {
      console.log(`  📝 Task ${taskId}: ${sessions.length} sessões ativas`);
      sessions.forEach(s => {
        const duration = Math.floor((Date.now() - new Date(s.start_time).getTime()) / 1000);
        console.log(`    - Sessão ${s.id}: ${Math.floor(duration/3600)}h ${Math.floor((duration%3600)/60)}m`);
      });
    }

    // Opção 1: Finalizar sessões muito antigas (mais de 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oldSessions = activeSessions.filter(s => s.start_time < oneDayAgo);

    if (oldSessions.length > 0) {
      console.log(`⏰ Finalizando ${oldSessions.length} sessões antigas (>24h)...`);
      
      const { error: updateError } = await supabase
        .from('task_time_sessions')
        .update({ end_time: new Date().toISOString() })
        .in('id', oldSessions.map(s => s.id));

      if (updateError) {
        console.error('❌ Erro ao finalizar sessões antigas:', updateError);
      } else {
        console.log('✅ Sessões antigas finalizadas com sucesso');
      }
    }

    // Opção 2: Para tarefas com múltiplas sessões, manter apenas a mais recente
    for (const [taskId, sessions] of tasksWithMultipleSessions) {
      if (sessions.length > 1) {
        // Ordenar por start_time (mais recente primeiro)
        sessions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        
        // Manter apenas a primeira (mais recente), finalizar as outras
        const sessionsToFinalize = sessions.slice(1);
        
        console.log(`🔧 Task ${taskId}: Mantendo sessão mais recente, finalizando ${sessionsToFinalize.length} antigas`);
        
        const { error: updateError } = await supabase
          .from('task_time_sessions')
          .update({ end_time: new Date().toISOString() })
          .in('id', sessionsToFinalize.map(s => s.id));

        if (updateError) {
          console.error(`❌ Erro ao finalizar sessões da task ${taskId}:`, updateError);
        } else {
          console.log(`✅ Sessões da task ${taskId} finalizadas`);
        }
      }
    }

    console.log('🎉 Limpeza concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  cleanupActiveSessions();
}

module.exports = { cleanupActiveSessions };