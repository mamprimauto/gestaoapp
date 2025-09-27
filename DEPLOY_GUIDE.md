# 🚀 Guia Completo de Deploy - Digital Ocean

Este guia te ajuda a fazer deploy da aplicação GestãoApp no Digital Ocean usando Docker.

## 📋 Pré-requisitos

- Conta no Digital Ocean
- Droplet Ubuntu 20.04 ou superior (mínimo 1GB RAM)
- Domínio configurado (opcional)

## 🌊 1. Preparar o Servidor Digital Ocean

### 1.1 Criar Droplet
1. Acesse o Digital Ocean e crie um novo Droplet
2. Escolha Ubuntu 20.04 LTS
3. Selecione o plano (mínimo $6/mês - 1GB RAM)
4. Adicione sua chave SSH ou configure senha
5. Crie o Droplet

### 1.2 Configurar o Servidor
```bash
# Conectar no servidor
ssh root@YOUR_SERVER_IP

# Executar script de configuração (copie o arquivo setup-server.sh)
chmod +x setup-server.sh
./setup-server.sh

# Fazer logout e login novamente
exit
ssh root@YOUR_SERVER_IP
```

## 💻 2. Preparar Aplicação Localmente

### 2.1 Executar Script de Deploy
```bash
# Na pasta do projeto
./deploy.sh
```

Este script vai:
- ✅ Verificar dependências
- ✅ Fazer build da aplicação
- ✅ Criar imagem Docker
- ✅ Testar localmente

### 2.2 Testar Localmente
```bash
# Verificar se está rodando
curl http://localhost:3000/api/public-env

# Ver logs
docker-compose logs -f

# Parar teste local
docker-compose down
```

## 📤 3. Enviar Arquivos para o Servidor

### 3.1 Criar Tarball
```bash
# Criar arquivo compactado (exclui node_modules)
tar -czf gestaoapp.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    .
```

### 3.2 Enviar para Servidor
```bash
# Copiar arquivo para servidor
scp gestaoapp.tar.gz root@YOUR_SERVER_IP:/opt/

# Conectar no servidor
ssh root@YOUR_SERVER_IP

# Extrair arquivos
cd /opt
tar -xzf gestaoapp.tar.gz -C gestaoapp/
rm gestaoapp.tar.gz
cd gestaoapp
```

## 🐳 4. Deploy no Servidor

### 4.1 Instalar Dependências e Fazer Build
```bash
# No diretório /opt/gestaoapp
npm ci
npm run build
```

### 4.2 Iniciar Aplicação
```bash
# Iniciar com Docker Compose
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f gestaoapp
```

## ⚡ 5. Configurar Nginx (Opcional)

### 5.1 Configurar Proxy Reverso
```bash
# Copiar configuração do Nginx
sudo cp nginx.conf /etc/nginx/sites-available/gestaoapp

# Editar para seu domínio
sudo nano /etc/nginx/sites-available/gestaoapp
# Altere "your-domain.com" para seu domínio

# Ativar site
sudo ln -s /etc/nginx/sites-available/gestaoapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 5.2 Configurar SSL (Opcional)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 6. Comandos Úteis

### Gerenciar Aplicação
```bash
# Ver status
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Parar aplicação
docker-compose down

# Reiniciar aplicação
docker-compose restart

# Atualizar aplicação
git pull  # se usando git
docker-compose down
docker-compose build
docker-compose up -d
```

### Monitoramento
```bash
# Uso de recursos
docker stats

# Espaço em disco
df -h

# Logs do sistema
sudo journalctl -f
```

## 🛠️ 7. Troubleshooting

### Problema: Aplicação não inicia
```bash
# Verificar logs
docker-compose logs gestaoapp

# Verificar se a porta está livre
sudo netstat -tlnp | grep 3000

# Verificar variáveis de ambiente
docker-compose exec gestaoapp env | grep SUPABASE
```

### Problema: Erro de conexão com banco
```bash
# Verificar variáveis do Supabase
cat .env.production | grep SUPABASE

# Testar conexão
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://dpajrkohmqdbskqbimqf.supabase.co/rest/v1/
```

### Problema: Nginx não funciona
```bash
# Verificar status do Nginx
sudo systemctl status nginx

# Verificar configuração
sudo nginx -t

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

## 📊 8. Backups

### Backup da Aplicação
```bash
# Backup do código
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/gestaoapp/

# Backup das configurações
cp /etc/nginx/sites-available/gestaoapp nginx-backup.conf
```

### Backup do Banco (Supabase)
O Supabase já faz backups automaticamente, mas você pode:
1. Acessar o dashboard do Supabase
2. Ir em Settings > Database
3. Fazer backup manual se necessário

## 🎯 9. Checklist Final

- [ ] Servidor Digital Ocean configurado
- [ ] Docker e Docker Compose instalados
- [ ] Aplicação fazendo build localmente
- [ ] Arquivos enviados para servidor
- [ ] Docker container rodando no servidor
- [ ] Aplicação acessível via IP do servidor
- [ ] Nginx configurado (se usando domínio)
- [ ] SSL configurado (se necessário)
- [ ] Firewall configurado
- [ ] Backups configurados

## 🌐 10. Acessar Aplicação

Após o deploy completo, sua aplicação estará disponível em:

- **Com IP**: `http://YOUR_SERVER_IP:3000`
- **Com domínio e Nginx**: `http://your-domain.com`
- **Com SSL**: `https://your-domain.com`

## 💡 Dicas Importantes

1. **Segurança**: Sempre use HTTPS em produção
2. **Performance**: Configure cache no Nginx para arquivos estáticos
3. **Monitoramento**: Configure logs e alertas
4. **Backups**: Faça backups regulares
5. **Updates**: Mantenha sistema e aplicação atualizados

---

**🆘 Precisa de ajuda?**
Se encontrar algum problema, verifique os logs primeiro:
```bash
docker-compose logs -f
sudo tail -f /var/log/nginx/error.log
```
