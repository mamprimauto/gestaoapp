#!/bin/bash
# 🔑 Setup de Chave SSH - Eliminar senhas no deploy

echo "🔑 Configurando chave SSH para deploy sem senha..."

# 1. Gerar chave SSH (se não existir)
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "📝 Gerando nova chave SSH..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    echo "✅ Chave SSH gerada!"
else
    echo "✅ Chave SSH já existe!"
fi

# 2. Copiar chave pública para o servidor
echo "📤 Enviando chave pública para servidor..."
echo "⚠️  Vai pedir senha uma ÚLTIMA vez:"

ssh-copy-id root@167.172.216.10

echo ""
echo "🎉 PRONTO! Agora você pode fazer deploy SEM SENHA!"
echo ""
echo "✅ Para testar:"
echo "   ssh root@167.172.216.10 'echo Funcionou sem senha!'"
echo ""
echo "🚀 Agora pode usar:"
echo "   ./deploy-auto.sh"
echo ""
