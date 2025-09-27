#!/bin/bash

echo "🔧 Corrigindo estrutura de rotas de login..."

# Navegar para o diretório da aplicação
cd /opt/gestaoapp

# Verificar se existe o arquivo antigo
if [ -f "app/login/page.tsx" ]; then
    echo "❌ Arquivo duplicado encontrado: app/login/page.tsx"
    echo "🗑️ Removendo arquivo antigo..."
    rm -f app/login/page.tsx
    
    # Remover diretório se estiver vazio
    if [ -d "app/login" ]; then
        rmdir app/login 2>/dev/null
        echo "📁 Diretório antigo removido"
    fi
else
    echo "✅ Arquivo antigo já foi removido"
fi

# Verificar se o novo arquivo existe
if [ -f "app/(auth)/login/page.tsx" ]; then
    echo "✅ Novo arquivo encontrado: app/(auth)/login/page.tsx"
else
    echo "⚠️ AVISO: Novo arquivo não encontrado em app/(auth)/login/page.tsx"
    echo "📝 Certifique-se de fazer o deploy da versão mais recente"
fi

# Limpar cache do Next.js
echo "🧹 Limpando cache do Next.js..."
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Estrutura corrigida!"
echo ""
echo "📝 Próximos passos:"
echo "1. Execute: git pull (se usando git)"
echo "2. Execute: npm install"
echo "3. Execute: npm run build"
echo "4. Execute: pm2 restart gestaoapp (ou seu comando de restart)"