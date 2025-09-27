const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createInternalFinancialTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL ou Key não encontrados')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })

  console.log('🚀 Criando tabela internal_financial_data...')

  // Verificar se a tabela já existe
  try {
    const { error: checkError } = await supabase
      .from('internal_financial_data')
      .select('id')
      .limit(1)
    
    if (!checkError) {
      console.log('✅ Tabela internal_financial_data já existe')
      return
    }
  } catch (err) {
    console.log('📝 Tabela não existe, criando...')
  }

  // SQL para criar a tabela
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS internal_financial_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
      year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
      
      -- Entradas
      faturamento_bruto DECIMAL(15,2) NOT NULL DEFAULT 0,
      numero_vendas INTEGER NOT NULL DEFAULT 0,
      
      -- Saídas - Custos Fixos
      custos_fixos DECIMAL(15,2) DEFAULT 0,
      equipe_fixa DECIMAL(15,2) DEFAULT 0,
      ferramentas DECIMAL(15,2) DEFAULT 0,
      
      -- Saídas - Custos Variáveis
      custos_variaveis DECIMAL(15,2) DEFAULT 0,
      trafego_pago DECIMAL(15,2) DEFAULT 0,
      chargebacks_reembolsos DECIMAL(15,2) DEFAULT 0,
      
      -- Percentuais configuráveis
      taxa_plataforma_percentual DECIMAL(5,2) DEFAULT 4.99,
      imposto_percentual DECIMAL(5,2) DEFAULT 10.00,
      afiliados_percentual DECIMAL(5,2) DEFAULT 20.00,
      gestor_trafego_percentual DECIMAL(5,2) DEFAULT 15.00,
      copywriter_percentual DECIMAL(5,2) DEFAULT 10.00,
      
      -- Valores calculados automaticamente
      taxa_plataforma DECIMAL(15,2) DEFAULT 0,
      imposto DECIMAL(15,2) DEFAULT 0,
      pagamentos_afiliados DECIMAL(15,2) DEFAULT 0,
      comissao_gestor_trafego DECIMAL(15,2) DEFAULT 0,
      comissao_copywriter DECIMAL(15,2) DEFAULT 0,
      
      -- Indicadores calculados
      roi DECIMAL(8,2) DEFAULT 0,
      cac DECIMAL(10,2) DEFAULT 0,
      ticket_medio DECIMAL(10,2) DEFAULT 0,
      percentual_reembolso_chargeback DECIMAL(5,2) DEFAULT 0,
      margem_contribuicao DECIMAL(15,2) DEFAULT 0,
      lucro_liquido DECIMAL(15,2) DEFAULT 0,
      
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(month, year)
    );
  `

  // Executar via SQL direto
  try {
    const { error } = await supabase.rpc('exec', { sql: createTableSQL })
    if (error) {
      console.error('❌ Erro ao criar tabela:', error)
      
      // Tentar método alternativo
      console.log('🔄 Tentando método alternativo...')
      
      // Usar inserção dummy para forçar criação da tabela
      const { error: insertError } = await supabase
        .from('internal_financial_data')
        .insert([{
          month: 1,
          year: 2024,
          faturamento_bruto: 0,
          numero_vendas: 0
        }])
        .select()
        
      if (insertError && !insertError.message.includes('already exists')) {
        console.error('❌ Erro ao criar via método alternativo:', insertError)
        process.exit(1)
      } else {
        console.log('✅ Tabela criada via método alternativo')
      }
    } else {
      console.log('✅ Tabela criada com sucesso')
    }
  } catch (err) {
    console.error('❌ Erro geral:', err)
    process.exit(1)
  }

  console.log('🎉 Script executado com sucesso!')
}

// Executar
createInternalFinancialTable().catch(console.error)