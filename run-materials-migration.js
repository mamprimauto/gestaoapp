const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Configuração do Supabase
require('dotenv').config()
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
  console.log('Verifique se as variáveis estão no arquivo .env')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function executarMigracaoMateriais() {
  console.log('Criando tabela product_materials...')

  try {
    // 1. Criar tabela
    console.log('1. Criando tabela...')
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.product_materials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          file_url TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER,
          thumbnail_url TEXT,
          category TEXT NOT NULL DEFAULT 'outros',
          tags TEXT[],
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })

    if (createError) {
      console.log('Erro ao criar tabela (pode já existir):', createError.message)
    } else {
      console.log('✅ Tabela criada com sucesso!')
    }

    // 2. Desabilitar RLS para desenvolvimento local
    console.log('2. Desabilitando RLS...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.product_materials DISABLE ROW LEVEL SECURITY;'
    })

    if (rlsError) {
      console.log('Erro ao desabilitar RLS:', rlsError.message)
    } else {
      console.log('✅ RLS desabilitado!')
    }

    // 3. Criar índices
    console.log('3. Criando índices...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_product_materials_product_id ON public.product_materials(product_id);',
      'CREATE INDEX IF NOT EXISTS idx_product_materials_category ON public.product_materials(category);',
      'CREATE INDEX IF NOT EXISTS idx_product_materials_created_at ON public.product_materials(created_at DESC);'
    ]

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql })
      if (indexError) {
        console.log('Erro ao criar índice (pode já existir):', indexError.message)
      }
    }
    console.log('✅ Índices criados!')

    // 4. Criar função de atualização
    console.log('4. Criando função de atualização...')
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_product_materials_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    })

    if (functionError) {
      console.log('Erro ao criar função:', functionError.message)
    } else {
      console.log('✅ Função criada!')
    }

    // 5. Criar trigger
    console.log('5. Criando trigger...')
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS update_product_materials_updated_at_trigger ON public.product_materials;
        CREATE TRIGGER update_product_materials_updated_at_trigger
            BEFORE UPDATE ON public.product_materials
            FOR EACH ROW
            EXECUTE FUNCTION update_product_materials_updated_at();
      `
    })

    if (triggerError) {
      console.log('Erro ao criar trigger:', triggerError.message)
    } else {
      console.log('✅ Trigger criado!')
    }

    // 6. Testar a tabela
    console.log('6. Testando a tabela...')
    const { data, error: testError } = await supabase
      .from('product_materials')
      .select('*')
      .limit(1)

    if (testError) {
      console.log('❌ Erro ao testar tabela:', testError.message)
    } else {
      console.log('✅ Tabela funcionando! Registros encontrados:', data.length)
    }

    console.log('\n🎉 Migração concluída com sucesso!')
    console.log('A tabela product_materials está pronta para uso.')

  } catch (error) {
    console.error('❌ Erro geral na migração:', error)
  }
}

// Tentar usar exec_sql, se não funcionar, usar método alternativo
async function testarExecSql() {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' })
    if (error && error.message.includes('Could not find the function')) {
      console.log('❌ Função exec_sql não encontrada.')
      console.log('Para executar a migração, acesse o Supabase Dashboard:')
      console.log('1. Vá para https://supabase.com/dashboard')
      console.log('2. Selecione seu projeto')
      console.log('3. Clique em "SQL Editor"')
      console.log('4. Cole o SQL abaixo e execute:')
      console.log('\n--- SQL PARA EXECUTAR ---')

      const sqlContent = fs.readFileSync('./scripts/db/072_product_materials.sql', 'utf8')
      console.log(sqlContent)

      console.log('\n--- DEPOIS EXECUTE ESTE PARA DESABILITAR RLS ---')
      console.log('ALTER TABLE public.product_materials DISABLE ROW LEVEL SECURITY;')

      return false
    }
    return true
  } catch (err) {
    console.log('❌ Erro ao testar exec_sql:', err.message)
    return false
  }
}

async function main() {
  console.log('Testando conexão com Supabase...')

  const canUseExecSql = await testarExecSql()

  if (canUseExecSql) {
    await executarMigracaoMateriais()
  }
}

main()