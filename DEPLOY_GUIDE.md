# Guia de Deploy - Sistema de Gerenciamento NFC

Este guia descreve como fazer deploy do sistema em um servidor externo usando PostgreSQL.

## Pré-requisitos

- Node.js 22+
- PostgreSQL 12+
- Docker (opcional, para containerização)
- Git

## Opção 1: Deploy em Railway

Railway é a forma mais simples de fazer deploy com PostgreSQL integrado.

### Passos:

1. **Criar conta em Railway**
   - Acesse [railway.app](https://railway.app)
   - Faça login com GitHub

2. **Conectar repositório**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub"
   - Autorize e selecione o repositório

3. **Adicionar PostgreSQL**
   - Clique em "Add Service"
   - Selecione "PostgreSQL"
   - Railway criará automaticamente a variável `DATABASE_URL`

4. **Configurar variáveis de ambiente**
   - Vá para "Variables"
   - Adicione todas as variáveis do `.env.example`:
     - `VITE_APP_ID`
     - `JWT_SECRET`
     - `OWNER_NAME`
     - `OWNER_OPEN_ID`
     - `BUILT_IN_FORGE_API_KEY`
     - `BUILT_IN_FORGE_API_URL`
     - etc.

5. **Deploy automático**
   - Railway fará deploy automaticamente a cada push para a branch principal

## Opção 2: Deploy em Render

Render oferece hosting gratuito com PostgreSQL.

### Passos:

1. **Criar conta em Render**
   - Acesse [render.com](https://render.com)
   - Faça login com GitHub

2. **Criar Web Service**
   - Clique em "New +"
   - Selecione "Web Service"
   - Conecte seu repositório GitHub

3. **Configurar build**
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `pnpm start`

4. **Criar PostgreSQL Database**
   - Clique em "New +"
   - Selecione "PostgreSQL"
   - Render fornecerá a `DATABASE_URL`

5. **Conectar banco ao Web Service**
   - Vá para o Web Service
   - Adicione a variável `DATABASE_URL` do banco PostgreSQL
   - Adicione outras variáveis necessárias

## Opção 3: Deploy em VPS com Docker

Para máximo controle, use um VPS com Docker.

### Preparar servidor:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Criar docker-compose.yml:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: nfc_management
      POSTGRES_USER: nfc_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nfc_network
    restart: unless-stopped

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://nfc_user:${DB_PASSWORD}@postgres:5432/nfc_management
      VITE_APP_ID: ${VITE_APP_ID}
      JWT_SECRET: ${JWT_SECRET}
      OWNER_NAME: ${OWNER_NAME}
      OWNER_OPEN_ID: ${OWNER_OPEN_ID}
      BUILT_IN_FORGE_API_KEY: ${BUILT_IN_FORGE_API_KEY}
      BUILT_IN_FORGE_API_URL: ${BUILT_IN_FORGE_API_URL}
      VITE_FRONTEND_FORGE_API_KEY: ${VITE_FRONTEND_FORGE_API_KEY}
      VITE_FRONTEND_FORGE_API_URL: ${VITE_FRONTEND_FORGE_API_URL}
      VITE_OAUTH_PORTAL_URL: ${VITE_OAUTH_PORTAL_URL}
      OAUTH_SERVER_URL: ${OAUTH_SERVER_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    networks:
      - nfc_network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  nfc_network:
    driver: bridge
```

### Criar .env para Docker:

```bash
DB_PASSWORD=seu_senha_segura_aqui
VITE_APP_ID=seu_app_id
JWT_SECRET=seu_jwt_secret
OWNER_NAME=Admin
OWNER_OPEN_ID=seu_open_id
BUILT_IN_FORGE_API_KEY=sua_api_key
BUILT_IN_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OAUTH_SERVER_URL=https://api.manus.im
```

### Deploy:

```bash
# Fazer build e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar
docker-compose down
```

## Opção 4: Deploy em Heroku

Heroku descontinuou o free tier, mas ainda oferece planos pagos.

```bash
# Instalar Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Criar app
heroku create seu-app-name

# Adicionar PostgreSQL
heroku addons:create heroku-postgresql:mini

# Fazer deploy
git push heroku main

# Ver logs
heroku logs --tail
```

## Migração de Dados

Se você tem dados no SQLite antigo:

```bash
# Exportar de SQLite
sqlite3 old_database.db .dump > dump.sql

# Converter para PostgreSQL (manual ou com ferramentas)
# Muitos comandos SQL são compatíveis

# Importar no PostgreSQL
psql postgresql://user:password@host/database < dump.sql
```

## Monitoramento e Manutenção

### Backup automático

```bash
# Script de backup diário
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql
# Enviar para S3 ou armazenamento em nuvem
```

### Verificar saúde

```bash
# Testar endpoint
curl https://seu-app.com/

# Ver logs
docker-compose logs app

# Verificar banco
psql $DATABASE_URL -c "SELECT version();"
```

### Atualizar aplicação

```bash
# Pull latest code
git pull origin main

# Rebuild Docker image
docker-compose build

# Restart
docker-compose up -d
```

## Troubleshooting

### Erro: "Cannot connect to database"
- Verificar `DATABASE_URL`
- Verificar firewall/security groups
- Verificar credenciais PostgreSQL

### Erro: "Tables not found"
```bash
# Executar migrações
docker-compose exec app pnpm db:push
```

### Performance lenta
- Adicionar índices (ver POSTGRESQL_SETUP.md)
- Aumentar recursos do servidor
- Otimizar queries

## Segurança

### Recomendações:

1. **Usar HTTPS**
   - Configurar certificado SSL/TLS
   - Usar Let's Encrypt (gratuito)

2. **Variáveis de ambiente seguras**
   - Nunca commitar `.env`
   - Usar secrets management do provedor

3. **Backup regular**
   - Backup diário automático
   - Testar restore periodicamente

4. **Atualizações**
   - Manter Node.js atualizado
   - Manter dependências atualizadas

5. **Firewall**
   - Restringir acesso ao banco de dados
   - Usar VPN se necessário

## Suporte

Para problemas, consulte:
- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [Documentação Drizzle ORM](https://orm.drizzle.team/)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
