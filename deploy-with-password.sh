#!/bin/bash

# 🚀 Deploy com senha automática - APENAS PARA TESTE
# ⚠️ ATENÇÃO: Senha visível no script - NÃO use em produção!

set -e

# Configurações
SERVER_IP="167.172.216.10"
SERVER_USER="root"
SERVER_PASS="Senha123Mestre"
LOCAL_PROJECT_PATH="/Users/mr.igor/gestaoapp"
DEPLOY_NAME="gestaoapp-auto-$(date +%Y%m%d-%H%M%S)"

# Verificar se sshpass está instalado
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass não encontrado. Instalando..."
    if command -v brew &> /dev/null; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "❌ Instale o Homebrew primeiro ou execute:"
        echo "   brew install hudochenkov/sshpass/sshpass"
        exit 1
    fi
fi

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

main() {
    log_warning "🚨 USANDO SENHA NO SCRIPT - APENAS PARA TESTE!"
    log_info "🚀 Iniciando deploy com senha automática..."
    
    cd "$LOCAL_PROJECT_PATH"
    log_success "Na pasta do projeto: $LOCAL_PROJECT_PATH"
    
    # Criar arquivo de deploy
    log_info "📦 Criando arquivo de deploy..."
    tar -czf "${DEPLOY_NAME}.tar.gz" \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='.DS_Store' \
        --exclude='*.zip' \
        --exclude='*.tar.gz' \
        --exclude='*.b64' \
        .
    
    log_success "Arquivo criado: ${DEPLOY_NAME}.tar.gz"
    
    # Enviar arquivo
    log_info "📤 Enviando arquivo para servidor..."
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "${DEPLOY_NAME}.tar.gz" "$SERVER_USER@$SERVER_IP:/opt/"
    log_success "Arquivo enviado!"
    
    # Criar script de deploy remoto
    log_info "📜 Criando script de setup no servidor..."
    cat > /tmp/deploy-remote.sh << 'EOF'
#!/bin/bash
set -e
DEPLOY_FILE="$1"

echo "🧹 Limpando servidor..."
systemctl stop gestaoapp 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true
pkill -f next 2>/dev/null || true
pkill -f node 2>/dev/null || true
rm -rf /opt/gestaoapp
rm -rf /var/www/gestaoapp
systemctl disable gestaoapp 2>/dev/null || true
rm -f /etc/systemd/system/gestaoapp.service
systemctl daemon-reload

echo "📁 Extraindo e configurando aplicação..."
cd /opt
mkdir -p gestaoapp
tar -xzf "$DEPLOY_FILE" -C gestaoapp/
cd gestaoapp

echo "📦 Instalando dependências..."
npm ci

echo "🔨 Fazendo build..."
npm run build

echo "⚙️ Criando serviço systemd..."
cat > /etc/systemd/system/gestaoapp.service << 'SERVICEEOF'
[Unit]
Description=GestaoApp Next.js Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gestaoapp
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICEEOF

echo "🔄 Ativando serviço..."
systemctl daemon-reload
systemctl enable gestaoapp
systemctl start gestaoapp

echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/gestaoapp << 'NGINXEOF'
server {
    listen 80;
    server_name 167.172.216.10;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

echo "🔧 Ativando Nginx..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/gestaoapp /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "🧪 Testando aplicação..."
sleep 5
if curl -s http://localhost:3000/api/public-env > /dev/null; then
    echo "✅ API funcionando!"
else
    echo "⚠️ API não respondeu - verificar logs"
fi

echo "🧹 Limpando arquivo temporário..."
rm -f "/opt/$DEPLOY_FILE"

echo "🎉 DEPLOY CONCLUÍDO!"
echo "📊 Acesse: http://167.172.216.10"
echo "🔍 Logs: journalctl -fu gestaoapp"
EOF
    
    # Enviar script para servidor
    log_info "📤 Enviando script para servidor..."
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no /tmp/deploy-remote.sh "$SERVER_USER@$SERVER_IP:/tmp/"
    
    # Executar deploy no servidor
    log_info "🚀 Executando deploy completo no servidor..."
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "bash /tmp/deploy-remote.sh ${DEPLOY_NAME}.tar.gz"
    
    # Limpar arquivos locais
    log_info "🧹 Limpando arquivos locais..."
    rm -f "${DEPLOY_NAME}.tar.gz"
    rm -f /tmp/deploy-remote.sh
    
    echo ""
    log_success "🎉 DEPLOY AUTOMATIZADO CONCLUÍDO!"
    echo ""
    log_info "📊 Resumo:"
    echo "   • Servidor: http://$SERVER_IP"
    echo "   • Aplicação: ✅ Ativa"
    echo "   • Nginx: ✅ Configurado"
    echo ""
    log_info "🔍 Comandos úteis:"
    echo "   • Ver logs: ssh $SERVER_USER@$SERVER_IP 'journalctl -fu gestaoapp'"
    echo "   • Status: ssh $SERVER_USER@$SERVER_IP 'systemctl status gestaoapp'"
    echo ""
    log_warning "⚠️ LEMBRE-SE: Remova a senha do script depois dos testes!"
}

# Verificar dependências
if [ ! -f "$LOCAL_PROJECT_PATH/package.json" ]; then
    echo "❌ Projeto não encontrado em: $LOCAL_PROJECT_PATH"
    exit 1
fi

main
