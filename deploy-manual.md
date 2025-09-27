# 🚀 Deploy Manual - Atualização do GestãoApp

## ✅ Status do Build
- ✅ Build da aplicação concluído com sucesso
- ✅ Arquivo de deploy criado: `gestaoapp-deploy-20250903-150803.tar.gz`
- ⚠️ Warnings no build (normais para Supabase/Edge Runtime)

## 📋 Próximos Passos Manuais

### 1. Enviar arquivo para o servidor
```bash
# Execute este comando no seu terminal (substitua por sua chave SSH se necessário)
scp gestaoapp-deploy-20250903-150803.tar.gz root@167.172.216.10:/opt/
```

### 2. Conectar no servidor e fazer deploy
```bash
# Conectar no servidor
ssh root@167.172.216.10

# Parar a aplicação atual
systemctl stop gestaoapp

# Fazer backup da versão atual (opcional)
cp -r /opt/gestaoapp /opt/gestaoapp-backup-$(date +%Y%m%d-%H%M%S)

# Extrair nova versão
cd /opt
tar -xzf gestaoapp-deploy-20250903-150803.tar.gz -C gestaoapp/

# Ir para diretório da aplicação
cd gestaoapp

# Instalar dependências (se necessário)
npm ci

# Fazer build no servidor (já foi feito localmente, mas é boa prática)
npm run build

# Iniciar aplicação
systemctl start gestaoapp

# Verificar se funcionou
systemctl status gestaoapp

# Testar aplicação
curl http://localhost:3000/api/public-env
```

### 3. Verificar logs
```bash
# Ver logs em tempo real
journalctl -fu gestaoapp

# Ver status
systemctl status gestaoapp
```

### 4. Limpar arquivo temporário
```bash
rm /opt/gestaoapp-deploy-20250903-150803.tar.gz
```

## 🔧 Resolução de Problemas

### Se a aplicação não iniciar:
```bash
# Ver logs detalhados
journalctl -u gestaoapp --since "10 minutes ago"

# Verificar se a porta está em uso
netstat -tlnp | grep 3000

# Reiniciar aplicação
systemctl restart gestaoapp
```

### Se houver erro de dependências:
```bash
cd /opt/gestaoapp
rm -rf node_modules package-lock.json
npm install
npm run build
systemctl restart gestaoapp
```

## 📊 Informações do Deploy

- **Build Status**: ✅ Sucesso
- **Arquivo**: gestaoapp-deploy-20250903-150803.tar.gz (159MB)
- **Data/Hora**: 03/09/2025 15:08
- **Servidor**: 167.172.216.10
- **Porta**: 3000

## ⚠️ Avisos Importantes

1. **Warnings no build**: São normais devido ao Supabase e Edge Runtime
2. **Route estática**: Algumas rotas da API são dinâmicas por design
3. **Next.config**: Warning sobre chave 'api' - não afeta funcionamento

## 🎯 Checklist Pós-Deploy

- [ ] Aplicação iniciou sem erros
- [ ] API `/api/public-env` responde
- [ ] Login funciona
- [ ] Páginas principais carregam
- [ ] Logs não mostram erros críticos
- [ ] Performance está adequada
