#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // Para operações administrativas

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  console.log('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Usar service key se disponível, senão usar anon key
const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function getDataCounts() {
  try {
    const counts = {}
    
    // Contar tarefas
    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
    counts.tasks = tasksCount || 0

    // Contar comentários de tarefas
    const { count: commentsCount } = await supabase
      .from('task_comments')
      .select('*', { count: 'exact', head: true })
    counts.task_comments = commentsCount || 0

    // Contar testes A/B
    const { count: abTestsCount } = await supabase
      .from('ab_tests')
      .select('*', { count: 'exact', head: true })
    counts.ab_tests = abTestsCount || 0

    // Contar produtos vault
    const { count: vaultCount } = await supabase
      .from('vault_products')
      .select('*', { count: 'exact', head: true })
    counts.vault_products = vaultCount || 0

    // Contar membros (excluindo owners)
    const { count: membersCount } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'owner')
    counts.workspace_members = membersCount || 0

    return counts
  } catch (error) {
    console.error('Erro ao obter contagens:', error)
    return {}
  }
}

async function cleanDatabase(options = {}) {
  const {
    tasks = true,
    abTests = true,
    vault = true,
    members = false
  } = options

  console.log('\n🧹 Iniciando limpeza do banco de dados...\n')

  try {
    // Limpar comentários de tarefas
    if (tasks) {
      console.log('  Limpando comentários de tarefas...')
      const { error: commentsError } = await supabase
        .from('task_comments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Deletar tudo
      if (commentsError) console.error('  ❌ Erro ao limpar comentários:', commentsError.message)
      else console.log('  ✅ Comentários de tarefas limpos')

      console.log('  Limpando sessões de tempo...')
      const { error: sessionsError } = await supabase
        .from('time_tracking_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (sessionsError) console.error('  ❌ Erro ao limpar sessões:', sessionsError.message)
      else console.log('  ✅ Sessões de tempo limpas')

      console.log('  Limpando itens de checklist...')
      const { error: checklistError } = await supabase
        .from('task_checklist_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (checklistError) console.error('  ❌ Erro ao limpar checklist:', checklistError.message)
      else console.log('  ✅ Itens de checklist limpos')

      console.log('  Limpando tarefas...')
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (tasksError) console.error('  ❌ Erro ao limpar tarefas:', tasksError.message)
      else console.log('  ✅ Tarefas limpas')
    }

    // Limpar testes A/B
    if (abTests) {
      console.log('  Limpando comentários de testes A/B...')
      const { error: abCommentsError } = await supabase
        .from('ab_test_comments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (abCommentsError) console.error('  ❌ Erro ao limpar comentários A/B:', abCommentsError.message)
      else console.log('  ✅ Comentários de testes A/B limpos')

      console.log('  Limpando variações de testes A/B...')
      const { error: variationsError } = await supabase
        .from('ab_test_variations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (variationsError) console.error('  ❌ Erro ao limpar variações:', variationsError.message)
      else console.log('  ✅ Variações de testes A/B limpas')

      console.log('  Limpando testes A/B...')
      const { error: abTestsError } = await supabase
        .from('ab_tests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (abTestsError) console.error('  ❌ Erro ao limpar testes A/B:', abTestsError.message)
      else console.log('  ✅ Testes A/B limpos')
    }

    // Limpar vault
    if (vault) {
      console.log('  Limpando produtos do vault...')
      const { error: vaultError } = await supabase
        .from('vault_products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (vaultError) console.error('  ❌ Erro ao limpar vault:', vaultError.message)
      else console.log('  ✅ Produtos do vault limpos')
    }

    // Limpar membros (exceto owners)
    if (members) {
      console.log('  Limpando membros (exceto owners)...')
      const { error: membersError } = await supabase
        .from('workspace_members')
        .delete()
        .neq('role', 'owner')
      if (membersError) console.error('  ❌ Erro ao limpar membros:', membersError.message)
      else console.log('  ✅ Membros limpos (owners mantidos)')
    }

    console.log('\n✅ Limpeza concluída!\n')
  } catch (error) {
    console.error('\n❌ Erro durante a limpeza:', error)
  }
}

async function main() {
  console.log('================================================')
  console.log('     🧹 LIMPEZA COMPLETA DO BANCO DE DADOS')
  console.log('================================================')
  console.log('\n⚠️  ATENÇÃO: Esta operação irá DELETAR dados!')
  console.log('    Esta ação NÃO PODE ser desfeita!\n')

  // Mostrar contagens atuais
  console.log('📊 Dados atuais no banco:')
  const counts = await getDataCounts()
  for (const [table, count] of Object.entries(counts)) {
    console.log(`   ${table}: ${count} registros`)
  }

  console.log('\n🎯 O que você deseja limpar?')
  console.log('   1. Tudo (tarefas, testes A/B, vault)')
  console.log('   2. Apenas tarefas e comentários')
  console.log('   3. Apenas testes A/B')
  console.log('   4. Apenas vault')
  console.log('   5. Apenas membros (exceto owners)')
  console.log('   6. Tudo + Membros')
  console.log('   0. Cancelar\n')

  const choice = await question('Escolha uma opção (0-6): ')

  if (choice === '0') {
    console.log('\n❌ Operação cancelada.')
    rl.close()
    return
  }

  const confirm = await question('\n⚠️  Tem CERTEZA? Digite "SIM" para confirmar: ')
  
  if (confirm !== 'SIM') {
    console.log('\n❌ Operação cancelada.')
    rl.close()
    return
  }

  switch(choice) {
    case '1':
      await cleanDatabase({ tasks: true, abTests: true, vault: true, members: false })
      break
    case '2':
      await cleanDatabase({ tasks: true, abTests: false, vault: false, members: false })
      break
    case '3':
      await cleanDatabase({ tasks: false, abTests: true, vault: false, members: false })
      break
    case '4':
      await cleanDatabase({ tasks: false, abTests: false, vault: true, members: false })
      break
    case '5':
      await cleanDatabase({ tasks: false, abTests: false, vault: false, members: true })
      break
    case '6':
      await cleanDatabase({ tasks: true, abTests: true, vault: true, members: true })
      break
    default:
      console.log('\n❌ Opção inválida.')
  }

  // Mostrar contagens finais
  console.log('📊 Dados após limpeza:')
  const finalCounts = await getDataCounts()
  for (const [table, count] of Object.entries(finalCounts)) {
    console.log(`   ${table}: ${count} registros`)
  }

  rl.close()
}

// Executar
main().catch(console.error)