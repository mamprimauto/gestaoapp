#!/bin/bash

# Script para fazer deploy no Digital Ocean
set -e

echo "🚀 Iniciando deploy para Digital Ocean..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    echo "Instale o Docker primeiro: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar se docker-compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado!${NC}"
    echo "Instale o Docker Compose primeiro: https://docs.docker.com/compose/install/"
    exit 1
fi

# Fazer backup das env vars atuais
echo -e "${YELLOW}📋 Fazendo backup das variáveis de ambiente...${NC}"
cp .env.local .env.local.backup

# Verificar se .env.production existe
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    echo "Criando .env.production baseado no .env.local..."
    cp .env.local .env.production
fi

# Build da aplicação
echo -e "${YELLOW}🔨 Fazendo build da aplicação...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha no build!${NC}"
    exit 1
fi

# Build da imagem Docker
echo -e "${YELLOW}🐳 Criando imagem Docker...${NC}"
docker build -t gestaoapp:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Imagem Docker criada com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha na criação da imagem Docker!${NC}"
    exit 1
fi

# Testar o container localmente
echo -e "${YELLOW}🧪 Testando container localmente...${NC}"
docker-compose up -d

# Aguardar alguns segundos para o container inicializar
sleep 10

# Verificar se o serviço está respondendo
if curl -f http://localhost:3000/api/public-env > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Aplicação está rodando localmente em http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️ Aplicação pode estar iniciando ainda...${NC}"
fi

echo -e "${GREEN}🎉 Deploy preparado com sucesso!${NC}"
echo ""
echo "📋 Próximos passos para Digital Ocean:"
echo "1. Faça upload dos arquivos para seu servidor Digital Ocean"
echo "2. No servidor, execute: docker-compose up -d"
echo "3. Configure um proxy reverso (Nginx) se necessário"
echo ""
echo "📁 Arquivos importantes criados:"
echo "   - Dockerfile"
echo "   - docker-compose.yml"
echo "   - .env.production"
echo "   - .dockerignore"
echo ""
echo "🔍 Para parar o teste local: docker-compose down"
