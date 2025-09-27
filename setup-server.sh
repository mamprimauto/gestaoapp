#!/bin/bash

# Script para configurar servidor Digital Ocean
set -e

echo "🌊 Configurando servidor Digital Ocean para gestaoapp..."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Atualizar sistema
echo -e "${YELLOW}📦 Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# Instalar Docker
echo -e "${YELLOW}🐳 Instalando Docker...${NC}"
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
echo -e "${YELLOW}📋 Instalando Docker Compose...${NC}"
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Nginx
echo -e "${YELLOW}⚡ Instalando Nginx...${NC}"
sudo apt install -y nginx

# Configurar firewall
echo -e "${YELLOW}🔥 Configurando firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw --force enable

# Criar diretório para aplicação
echo -e "${YELLOW}📁 Criando diretório para aplicação...${NC}"
sudo mkdir -p /opt/gestaoapp
sudo chown -R $USER:$USER /opt/gestaoapp

echo -e "${GREEN}✅ Servidor configurado com sucesso!${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo "1. Faça logout e login novamente para aplicar as permissões do Docker"
echo "2. Copie os arquivos da aplicação para /opt/gestaoapp/"
echo "3. Execute: cd /opt/gestaoapp && docker-compose up -d"
echo ""
echo -e "${YELLOW}🔧 Comandos úteis:${NC}"
echo "- Verificar status: docker-compose ps"
echo "- Ver logs: docker-compose logs -f"
echo "- Parar aplicação: docker-compose down"
echo "- Reiniciar: docker-compose restart"
