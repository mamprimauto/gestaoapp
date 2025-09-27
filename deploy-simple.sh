#!/bin/bash

# Script simples de deploy via SSH
echo "🚀 Deploy Simples para Digital Ocean"
echo "======================================"

# Configurações - AJUSTE AQUI
SERVER_USER="root"  # Ou seu usuário no servidor
SERVER_IP="YOUR_SERVER_IP"  # COLOQUE O IP DO SEU SERVIDOR AQUI
SERVER_PATH="/var/www/gestaoapp"  # Caminho no servidor

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📦 Fazendo build da aplicação...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído!${NC}"

echo -e "${YELLOW}📤 Preparando arquivos para envio...${NC}"
# Criar arquivo tar com os arquivos necessários
tar -czf gestaoapp-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next/cache \
    .next \
    app \
    components \
    lib \
    public \
    package.json \
    package-lock.json \
    next.config.mjs \
    tailwind.config.ts \
    tsconfig.json \
    .env.production

echo -e "${YELLOW}📡 Enviando para o servidor...${NC}"
echo "Digite a senha do servidor quando solicitado:"

# Enviar arquivo para o servidor
scp gestaoapp-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

# Executar comandos no servidor
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    cd /var/www/gestaoapp || exit 1

    echo "📥 Extraindo arquivos..."
    tar -xzf /tmp/gestaoapp-deploy.tar.gz

    echo "📦 Instalando dependências..."
    npm install --production

    echo "🔄 Reiniciando aplicação..."
    pm2 restart gestaoapp || pm2 start npm --name gestaoapp -- start

    echo "🧹 Limpando arquivos temporários..."
    rm /tmp/gestaoapp-deploy.tar.gz

    echo "✅ Deploy concluído!"
ENDSSH

# Limpar arquivo local
rm gestaoapp-deploy.tar.gz

echo -e "${GREEN}🎉 Deploy finalizado com sucesso!${NC}"
echo "Acesse: http://${SERVER_IP}:3000"