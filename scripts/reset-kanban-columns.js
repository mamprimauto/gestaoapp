#!/usr/bin/env node

// Script para resetar as colunas do kanban aos valores padrão

const clearKanbanLocalStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Limpar todas as colunas kanban do localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('kanban-columns-')) {
        localStorage.removeItem(key);
        console.log(`✅ Removido: ${key}`);
      }
    });
    console.log('🔄 Colunas do kanban resetadas no localStorage!');
  } else {
    console.log('⚠️  Este script deve ser executado no navegador.');
    console.log('\n📋 Cole o seguinte código no console do navegador:\n');
    console.log(`
// Limpar colunas do kanban
const keys = Object.keys(localStorage);
keys.forEach(key => {
  if (key.includes('kanban-columns-')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});
console.log('Colunas resetadas! Recarregue a página.');
location.reload();
    `);
  }
};

// Se executado diretamente
if (require.main === module) {
  console.log('🔧 Script para resetar colunas do kanban');
  console.log('=========================================\n');
  clearKanbanLocalStorage();
}

module.exports = { clearKanbanLocalStorage };