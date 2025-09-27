// Teste temporário da API - cole no console do browser para testar

// Função para testar se a API responde
async function testAPI() {
  try {
    const response = await fetch('/api/admin/internal-financial/data?month=9&year=2025');
    const result = await response.json();
    console.log('✅ GET funcionando:', result);
    
    // Se GET funciona, o problema é só no POST com trigger
    console.log('🔍 Problema confirmado: trigger no banco precisa ser removido');
    console.log('📋 Execute o SQL no Supabase para resolver');
    
  } catch (error) {
    console.error('❌ Erro na API:', error);
  }
}

testAPI();