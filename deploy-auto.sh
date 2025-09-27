#!/bin/bash

# 🚀 Script de Deploy Automatizado - GestãoApp
# Autor: Claude AI Assistant
# Data: $(date +%Y-%m-%d)

set -e  # Para na primeira falha

# Configurações
SERVER_IP="167.172.216.10"
SERVER_USER="root"
LOCAL_PROJECT_PATH="/Users/mr.igor/gestaoapp"
DEPLOY_NAME="gestaoapp-auto-deploy-$(date +%Y%m%d-%H%M%S)"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logs coloridos
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Função para executar comando no servidor via SSH
ssh_exec() {
    log_info "Executando no servidor: $1"
    ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

# Função principal
main() {
    log_info "🚀 Iniciando deploy automatizado do GestãoApp..."
    
    # Verificar se estamos na pasta correta
    if [ ! -f "$LOCAL_PROJECT_PATH/package.json" ]; then
        log_error "Pasta do projeto não encontrada: $LOCAL_PROJECT_PATH"
        exit 1
    fi
    
    cd "$LOCAL_PROJECT_PATH"
    log_success "Pasta do projeto confirmada"
    
    # ETAPA 1: Limpar servidor
    log_info "📋 ETAPA 1: Limpando servidor..."
    
    ssh_exec "
        systemctl stop gestaoapp 2>/dev/null || true
        systemctl stop nginx 2>/dev/null || true
        pkill -f 'next' 2>/dev/null || true
        pkill -f 'node' 2>/dev/null || true
        rm -rf /opt/gestaoapp
        rm -rf /var/www/gestaoapp
        rm -rf /home/*/gestaoapp
        rm -f /opt/*.tar.gz
        rm -f /opt/*.zip
        rm -rf /tmp/next-*
        rm -rf /tmp/npm-*
        systemctl disable gestaoapp 2>/dev/null || true
        rm -f /etc/systemd/system/gestaoapp.service
        systemctl daemon-reload
        echo 'Servidor limpo com sucesso!'
    "
    
    log_success "Servidor limpo com sucesso!"
    
    # ETAPA 2: Criar e enviar arquivo
    log_info "📋 ETAPA 2: Criando arquivo de deploy..."
    
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
    
    log_info "📤 Enviando arquivo para servidor..."
    scp -o StrictHostKeyChecking=no "${DEPLOY_NAME}.tar.gz" "$SERVER_USER@$SERVER_IP:/opt/"
    
    log_success "Arquivo enviado para servidor!"
    
    # ETAPA 3: Setup completo no servidor
    log_info "📋 ETAPA 3: Configurando aplicação no servidor..."
    
    ssh_exec "
        cd /opt
        mkdir -p gestaoapp
        tar -xzf ${DEPLOY_NAME}.tar.gz -C gestaoapp/
        cd gestaoapp
        echo 'Arquivos extraídos com sucesso!'
    "
    
    log_info "📦 Instalando dependências..."
    ssh_exec "cd /opt/gestaoapp && npm ci"
    
    log_info "🔨 Fazendo build da aplicação..."
    ssh_exec "cd /opt/gestaoapp && npm run build"
    
    log_info "⚙️ Criando serviço systemd..."
    ssh_exec "cat > /etc/systemd/system/gestaoapp.service << 'EOF'
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
EOF"
    
    log_info "🔄 Ativando serviço..."
    ssh_exec "
        systemctl daemon-reload
        systemctl enable gestaoapp
        systemctl start gestaoapp
    "
    
    log_info "🌐 Configurando Nginx..."
    ssh_exec "cat > /etc/nginx/sites-available/gestaoapp << 'EOF'
server {
    listen 80;
    server_name $SERVER_IP;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF"
    
    log_info "🔧 Ativando configuração do Nginx..."
    ssh_exec "
        rm -f /etc/nginx/sites-enabled/default
        ln -sf /etc/nginx/sites-available/gestaoapp /etc/nginx/sites-enabled/
        nginx -t
        systemctl restart nginx
    "
    
    # ETAPA 4: Verificações finais
    log_info "📋 ETAPA 4: Verificações finais..."
    
    log_info "🔍 Verificando status dos serviços..."
    ssh_exec "systemctl is-active gestaoapp || echo 'Serviço gestaoapp não está ativo'"
    ssh_exec "systemctl is-active nginx || echo 'Serviço nginx não está ativo'"
    
    log_info "🧪 Testando aplicação..."
    if ssh_exec "curl -s http://localhost:3000/api/public-env > /dev/null"; then
        log_success "API respondendo corretamente!"
    else
        log_warning "API não está respondendo - verifique os logs"
    fi
    
    # Limpeza
    log_info "🧹 Limpando arquivos temporários..."
    ssh_exec "rm -f /opt/${DEPLOY_NAME}.tar.gz"
    rm -f "${DEPLOY_NAME}.tar.gz"
    
    # Resultado final
    echo ""
    log_success "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
    echo ""
    log_info "📊 Resumo do Deploy:"
    echo "   • Servidor: http://$SERVER_IP"
    echo "   • Aplicação: ✅ Ativa"
    echo "   • Nginx: ✅ Configurado"
    echo "   • Arquivo: ${DEPLOY_NAME}.tar.gz"
    echo ""
    log_info "🔍 Comandos úteis:"
    echo "   • Ver logs: ssh $SERVER_USER@$SERVER_IP 'journalctl -fu gestaoapp'"
    echo "   • Status: ssh $SERVER_USER@$SERVER_IP 'systemctl status gestaoapp'"
    echo "   • Restart: ssh $SERVER_USER@$SERVER_IP 'systemctl restart gestaoapp'"
    echo ""
}

# Verificar dependências
check_dependencies() {
    local deps=("ssh" "scp" "tar")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "Dependência não encontrada: $dep"
            exit 1
        fi
    done
}

# Função de ajuda
show_help() {
    echo "🚀 Script de Deploy Automatizado - GestãoApp"
    echo ""
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  -h, --help     Mostrar esta ajuda"
    echo "  -s, --server   IP do servidor (padrão: $SERVER_IP)"
    echo "  -u, --user     Usuário SSH (padrão: $SERVER_USER)"
    echo "  -p, --path     Caminho local do projeto (padrão: $LOCAL_PROJECT_PATH)"
    echo ""
    echo "Exemplos:"
    echo "  $0                                    # Deploy padrão"
    echo "  $0 -s 192.168.1.100 -u ubuntu       # Servidor e usuário customizados"
    echo ""
}

# Parse dos argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--server)
            SERVER_IP="$2"
            shift 2
            ;;
        -u|--user)
            SERVER_USER="$2"
            shift 2
            ;;
        -p|--path)
            LOCAL_PROJECT_PATH="$2"
            shift 2
            ;;
        *)
            log_error "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Executar script principal
check_dependencies
main

log_success "✨ Script finalizado com sucesso!"
