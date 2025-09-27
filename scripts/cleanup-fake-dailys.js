#!/usr/bin/env node

async function cleanupFakeDailys() {
  try {
    console.log('🧹 Iniciando limpeza de dailys fictícias...')

    // Get auth token from Supabase
    const response = await fetch('http://localhost:3000/api/auth/session', {
      credentials: 'include'
    })

    if (!response.ok) {
      console.error('❌ Erro: Você precisa estar logado como admin no navegador')
      console.log('Por favor, acesse http://localhost:3000 e faça login como admin')
      return
    }

    const session = await response.json()

    if (!session?.access_token) {
      console.error('❌ Erro: Token de autenticação não encontrado')
      return
    }

    // Execute cleanup
    const cleanupResponse = await fetch('http://localhost:3000/api/cleanup-dailys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!cleanupResponse.ok) {
      const error = await cleanupResponse.json()
      console.error('❌ Erro na limpeza:', error.error)
      return
    }

    const result = await cleanupResponse.json()

    console.log('✅ Limpeza concluída com sucesso!')
    console.log(`📊 Dailys fictícias removidas: ${result.deletedFake}`)
    console.log(`📊 Dailys antigas incompletas removidas: ${result.deletedOld}`)
    console.log(`📊 Total removido: ${result.deletedFake + result.deletedOld}`)

  } catch (error) {
    console.error('❌ Erro ao executar limpeza:', error)
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupFakeDailys()
}

module.exports = { cleanupFakeDailys }