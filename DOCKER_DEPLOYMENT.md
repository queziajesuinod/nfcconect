# Deployment com Docker e Traefik

Guia completo para fazer deploy do Sistema de Gerenciamento NFC usando Docker, Docker Compose e Traefik como reverse proxy.

## Arquitetura

```
┌─────────────────────────────────────────────┐
│         Internet (HTTPS)                    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  Traefik (Reverse Proxy + Let's Encrypt)   │
│  - Porta 80 (HTTP → HTTPS redirect)        │
│  - Porta 443 (HTTPS com SSL/TLS)           │
│  - Dashboard em pgadmin.example.com        │
└────────────────┬────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼──────────────┐  ┌──────▼──────────────┐
│  NFC App         │  │  pgAdmin           │
│  Port 3000       │  │  Port 80           │
│  (Node.js)       │  │  (Database UI)     │
└───┬──────────────┘  └──────┬──────────────┘
    │                        │
    └────────────┬───────────┘
                 │
         ┌───────▼────────┐
         │  PostgreSQL    │
         │  Port 5432     │
         │  (Banco Dados) │
         └────────────────┘
```

## Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+
- Domínio próprio com acesso ao DNS
- VPS ou servidor com Linux (Ubuntu 20.04+)
- Mínimo 2GB RAM, 10GB disco

## Instalação Rápida

### 1. Preparar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

### 2. Clonar Repositório

```bash
# Clonar projeto
git clone https://github.com/seu-usuario/nfc_management_system.git
cd nfc_management_system

# Criar diretório para dados
mkdir -p data backups traefik
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.production.example .env.production

# Editar com seus valores
nano .env.production
```

**Variáveis essenciais:**

```env
DOMAIN=nfc.seu-dominio.com
DB_PASSWORD=sua_senha_super_segura_aqui
VITE_APP_ID=seu_app_id_manus
JWT_SECRET=sua_chave_jwt_aleatoria_longa
OWNER_NAME=Seu Nome
OWNER_OPEN_ID=seu_open_id
BUILT_IN_FORGE_API_KEY=sua_api_key
VITE_FRONTEND_FORGE_API_KEY=sua_frontend_key
```

### 4. Gerar Senha do Traefik

```bash
# Instalar htpasswd (se não tiver)
sudo apt install apache2-utils

# Gerar hash de senha (substitua "senha" pela sua senha)
htpasswd -nb admin senha

# Copiar o resultado para TRAEFIK_USER em .env.production
# Exemplo: admin:$apr1$H6uskkkW$IgstNWde3R9t7gLhNOHO91
```

### 5. Configurar DNS

Apontar seu domínio para o IP do servidor:

```bash
# Verificar IP do servidor
curl https://checkip.amazonaws.com

# Adicionar registro A no DNS:
# nfc.seu-dominio.com  A  seu.ip.do.servidor
# pgadmin.seu-dominio.com  A  seu.ip.do.servidor
```

Aguarde propagação DNS (pode levar até 24 horas).

### 6. Iniciar Aplicação

```bash
# Criar arquivo acme.json para Let's Encrypt
touch traefik/acme.json
chmod 600 traefik/acme.json

# Iniciar containers
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f app
```

### 7. Verificar Acesso

```bash
# Aguardar ~2 minutos para Let's Encrypt gerar certificado
sleep 120

# Testar aplicação
curl https://nfc.seu-dominio.com

# Acessar no navegador
# https://nfc.seu-dominio.com
# https://pgadmin.seu-dominio.com
```

## Gerenciamento

### Ver Logs

```bash
# Logs da aplicação
docker-compose logs -f app

# Logs do Traefik
docker-compose logs -f traefik

# Logs do PostgreSQL
docker-compose logs -f postgres

# Últimas 100 linhas
docker-compose logs --tail=100 app
```

### Parar/Reiniciar

```bash
# Parar todos os containers
docker-compose stop

# Reiniciar
docker-compose start

# Reiniciar apenas a aplicação
docker-compose restart app

# Parar e remover (cuidado!)
docker-compose down
```

### Atualizar Aplicação

```bash
# Pull código novo
git pull origin main

# Rebuild da imagem
docker-compose build --no-cache app

# Reiniciar
docker-compose up -d app

# Ver logs
docker-compose logs -f app
```

### Acessar Banco de Dados

```bash
# Via pgAdmin (web interface)
# https://pgadmin.seu-dominio.com

# Via linha de comando
docker-compose exec postgres psql -U nfc_user -d nfc_management

# Listar tabelas
\dt

# Sair
\q
```

## Backup e Restore

### Backup Automático

Adicione ao crontab para backup diário:

```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diário às 2 da manhã)
0 2 * * * cd /home/seu-usuario/nfc_management_system && ./scripts/backup-db.sh
```

### Backup Manual

```bash
# Fazer backup
./scripts/backup-db.sh

# Backup será salvo em ./backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

### Restaurar Backup

```bash
# Listar backups
ls -lh backups/

# Restaurar um backup
./scripts/restore-db.sh backups/backup_20240101_120000.sql.gz
```

## Monitoramento

### Health Check

```bash
# Verificar saúde da aplicação
curl https://nfc.seu-dominio.com/

# Verificar Traefik
curl http://localhost:8080/ping
```

### Estatísticas de Recursos

```bash
# CPU e memória
docker stats

# Tamanho dos volumes
docker volume ls
docker volume inspect nfc_management_system_postgres_data
```

### Logs do Let's Encrypt

```bash
# Ver logs de certificado
docker-compose logs traefik | grep acme
```

## Troubleshooting

### Erro: "Cannot connect to database"

```bash
# Verificar se PostgreSQL está rodando
docker-compose ps postgres

# Ver logs do PostgreSQL
docker-compose logs postgres

# Verificar conexão
docker-compose exec app psql $DATABASE_URL -c "SELECT 1"
```

### Erro: "Certificate error"

```bash
# Remover certificado antigo
rm traefik/acme.json

# Reiniciar Traefik
docker-compose restart traefik

# Aguardar ~2 minutos para novo certificado
sleep 120
```

### Erro: "Port already in use"

```bash
# Encontrar processo usando porta 80/443
sudo lsof -i :80
sudo lsof -i :443

# Matar processo (cuidado!)
sudo kill -9 <PID>

# Ou mudar porta no docker-compose.yml
```

### Erro: "Out of memory"

```bash
# Aumentar limite de memória
# Editar docker-compose.yml e adicionar:
# deploy:
#   resources:
#     limits:
#       memory: 2G

# Ou aumentar swap do servidor
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Erro: "DNS not resolving"

```bash
# Verificar DNS
nslookup nfc.seu-dominio.com

# Verificar propagação
dig nfc.seu-dominio.com

# Aguardar 24 horas se recém-configurado
```

## Segurança

### Boas Práticas

1. **Senhas Fortes**
   - Use senhas com 16+ caracteres
   - Inclua maiúsculas, minúsculas, números, símbolos

2. **Atualizações**
   ```bash
   # Manter imagens atualizadas
   docker-compose pull
   docker-compose up -d
   ```

3. **Firewall**
   ```bash
   # Permitir apenas portas necessárias
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

4. **Backup Regular**
   - Backup diário automático
   - Testar restore periodicamente
   - Armazenar backups em local seguro

5. **Monitoramento**
   - Verificar logs regularmente
   - Configurar alertas
   - Monitorar uso de recursos

### Configurar Cloudflare DNS (Opcional)

Para usar Cloudflare com DNS challenge:

1. Obter API token do Cloudflare
2. Descomentarlinhas em `.env.production`:
   ```env
   CF_API_EMAIL=seu_email@cloudflare.com
   CF_API_KEY=sua_api_key
   CF_DNS_API_TOKEN=seu_dns_token
   ```
3. Descomentarlinhas em `traefik/traefik.yml`:
   ```yaml
   dnsChallenge:
     provider: cloudflare
   ```
4. Reiniciar Traefik:
   ```bash
   docker-compose restart traefik
   ```

## Performance

### Otimizações

1. **Cache**
   ```bash
   # Adicionar middleware de cache no docker-compose.yml
   ```

2. **Compressão**
   ```bash
   # Já configurada no Traefik
   ```

3. **Rate Limiting**
   ```bash
   # Já configurado no traefik/config.yml
   ```

4. **Índices de Banco**
   ```bash
   # Executar script de índices
   docker-compose exec postgres psql -U nfc_user -d nfc_management -f /backups/indexes.sql
   ```

## Suporte

Para problemas:

1. Verificar logs: `docker-compose logs -f`
2. Consultar documentação:
   - [Docker Docs](https://docs.docker.com/)
   - [Traefik Docs](https://doc.traefik.io/)
   - [PostgreSQL Docs](https://www.postgresql.org/docs/)
3. Abrir issue no repositório

## Próximos Passos

- [ ] Configurar monitoramento (Prometheus + Grafana)
- [ ] Configurar alertas (Alertmanager)
- [ ] Adicionar CI/CD (GitHub Actions)
- [ ] Configurar load balancing
- [ ] Implementar disaster recovery


## Troubleshooting Avançado

### Reiniciar Traefik com Let's Encrypt

Se o certificado expirou ou não foi gerado:

```bash
# Backup do certificado antigo
cp traefik/acme.json traefik/acme.json.backup

# Remover certificado
rm traefik/acme.json

# Recriar arquivo vazio
touch traefik/acme.json
chmod 600 traefik/acme.json

# Reiniciar Traefik
docker-compose restart traefik

# Aguardar novo certificado (2-5 minutos)
sleep 300

# Verificar certificado
docker-compose logs traefik | grep acme
```

### Resetar Banco de Dados

⚠️ **CUIDADO: Isso deletará TODOS os dados!**

```bash
# Parar containers
docker-compose stop

# Remover volume do PostgreSQL
docker volume rm nfc_management_system_postgres_data

# Remover container
docker-compose rm postgres

# Reiniciar
docker-compose up -d

# Aguardar inicialização
sleep 30

# Ver logs
docker-compose logs postgres
```

### Aumentar Limite de Conexões PostgreSQL

Se receber erro "too many connections":

```bash
# Conectar ao banco
docker-compose exec postgres psql -U nfc_user -d nfc_management

# Aumentar limite (padrão é 100)
ALTER SYSTEM SET max_connections = 200;

# Sair
\q

# Reiniciar PostgreSQL
docker-compose restart postgres
```

## Checklist de Deployment

- [ ] Servidor preparado (Docker, Docker Compose)
- [ ] Repositório clonado
- [ ] `.env.production` configurado com valores reais
- [ ] DNS apontando para servidor
- [ ] Traefik iniciado e certificado gerado
- [ ] Aplicação rodando sem erros
- [ ] Banco de dados acessível
- [ ] Backup automático configurado
- [ ] Firewall configurado
- [ ] Monitoramento ativo
- [ ] Testes de acesso funcionando

## Suporte e Recursos

- **Documentação do Projeto**: Ver `README.md`
- **Setup PostgreSQL**: Ver `POSTGRESQL_SETUP.md`
- **Deploy Alternativo**: Ver `DEPLOY_GUIDE.md`
- **Docker Docs**: https://docs.docker.com/
- **Traefik Docs**: https://doc.traefik.io/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
