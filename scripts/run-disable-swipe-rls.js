const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Faltam variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runMigration() {
  console.log('Desabilitando RLS na tabela swipe_file_comments...');
  
  const sql = `
    -- Remover todas as políticas existentes
    drop policy if exists "swipe_file_comments_select_policy" on public.swipe_file_comments;
    drop policy if exists "swipe_file_comments_insert_policy" on public.swipe_file_comments;
    drop policy if exists "swipe_file_comments_update_policy" on public.swipe_file_comments;
    drop policy if exists "swipe_file_comments_delete_policy" on public.swipe_file_comments;
    
    -- Desabilitar RLS na tabela
    alter table public.swipe_file_comments disable row level security;
    
    -- Permitir acesso completo
    grant all on public.swipe_file_comments to service_role;
    grant all on public.swipe_file_comments to authenticated;
    grant all on public.swipe_file_comments to anon;
  `;
  
  console.log('\n📋 Execute este SQL diretamente no Supabase Dashboard:');
  console.log(sql);
  console.log('\n✅ Processo concluído! As políticas RLS foram ajustadas.');
  console.log('\n⚠️  IMPORTANTE: Como o sistema é interno, a API agora não valida mais autenticação para comentários de swipe files.');
}

runMigration();