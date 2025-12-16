# Configuração de Banco de Dados Externo

Guia completo para configurar PostgreSQL externo em diferentes plataformas.

## Variável de Ambiente

A configuração do banco de dados é feita através da variável `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://usuario:senha@host:porta/banco_dados
```

## Formato da Connection String

```
postgresql://[usuario]:[senha]@[host]:[porta]/[banco_dados]?[opcoes]
```

| Componente | Descrição | Exemplo |
|-----------|-----------|---------|
| `usuario` | Usuário do PostgreSQL | `postgres`, `nfc_user` |
| `senha` | Senha do usuário | `sua_senha_aqui` |
| `host` | Hostname ou IP | `localhost`, `db.example.com` |
| `porta` | Porta PostgreSQL | `5432` (padrão) |
| `banco_dados` | Nome do banco | `nfc_management` |
| `opcoes` | Parâmetros adicionais | `sslmode=require` |

## Plataformas Suportadas

### 1. PostgreSQL Local (Desenvolvimento)

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/nfc_management
```

**Instalação:**

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# Baixar de https://www.postgresql.org/download/windows/
```

**Criar banco:**

```bash
sudo -u postgres psql

CREATE DATABASE nfc_management;
CREATE USER nfc_user WITH PASSWORD 'sua_senha_aqui';
ALTER ROLE nfc_user SET client_encoding TO 'utf8';
ALTER ROLE nfc_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE nfc_user SET default_transaction_deferrable TO on;
ALTER ROLE nfc_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE nfc_management TO nfc_user;

\q
```

### 2. Railway

**Plataforma**: https://railway.app

**Vantagens**: Fácil setup, integração com GitHub, free tier

**Passo a passo:**

1. Criar conta em https://railway.app
2. Criar novo projeto
3. Adicionar PostgreSQL
4. Copiar `DATABASE_URL` da aba "Connect"

```bash
# Exemplo
DATABASE_URL=postgresql://postgres:password@containers.railway.app:7890/railway
```

**Configurar em .env.production:**

```bash
DATABASE_URL=postgresql://postgres:password@containers.railway.app:7890/railway
```

### 3. Render

**Plataforma**: https://render.com

**Vantagens**: Free tier, SSL automático, backups

**Passo a passo:**

1. Criar conta em https://render.com
2. Criar novo PostgreSQL Database
3. Copiar connection string

```bash
# Exemplo
DATABASE_URL=postgresql://user:password@dpg-xxxxx.render.com:5432/nfc_db
```

**Com SSL (recomendado):**

```bash
DATABASE_URL=postgresql://user:password@dpg-xxxxx.render.com:5432/nfc_db?sslmode=require
```

### 4. AWS RDS

**Plataforma**: https://aws.amazon.com/rds/

**Vantagens**: Escalável, backups automáticos, multi-AZ

**Passo a passo:**

1. Acessar AWS Console
2. RDS → Create Database
3. Engine: PostgreSQL
4. DB instance class: db.t3.micro (free tier)
5. Configurar credenciais
6. Copiar endpoint

```bash
# Exemplo
DATABASE_URL=postgresql://admin:password@nfc-db.xxxxx.us-east-1.rds.amazonaws.com:5432/nfc_management
```

**Com SSL:**

```bash
DATABASE_URL=postgresql://admin:password@nfc-db.xxxxx.us-east-1.rds.amazonaws.com:5432/nfc_management?sslmode=require
```

### 5. Azure Database for PostgreSQL

**Plataforma**: https://azure.microsoft.com/

**Vantagens**: Integração Azure, backups, segurança

**Passo a passo:**

1. Azure Portal → Create Resource → Database for PostgreSQL
2. Configurar servidor
3. Copiar connection string

```bash
# Exemplo
DATABASE_URL=postgresql://user@server:password@server.postgres.database.azure.com:5432/nfc_management
```

**Com SSL (obrigatório):**

```bash
DATABASE_URL=postgresql://user@server:password@server.postgres.database.azure.com:5432/nfc_management?sslmode=require
```

### 6. Supabase

**Plataforma**: https://supabase.com

**Vantagens**: PostgreSQL gerenciado, auth integrado, realtime

**Passo a passo:**

1. Criar conta em https://supabase.com
2. Criar novo projeto
3. Copiar connection string em Settings → Database

```bash
# Exemplo
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

**Com SSL:**

```bash
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

### 7. DigitalOcean Managed Database

**Plataforma**: https://www.digitalocean.com/

**Vantagens**: Simples, preço baixo, backups automáticos

**Passo a passo:**

1. DigitalOcean Dashboard → Managed Databases
2. Create Database Cluster
3. Engine: PostgreSQL
4. Copiar connection string

```bash
# Exemplo
DATABASE_URL=postgresql://doadmin:password@db-xxxxx-do-user-xxxxx.db.ondigitalocean.com:25060/nfc_management?sslmode=require
```

### 8. Heroku PostgreSQL

**Plataforma**: https://www.heroku.com/

**Vantagens**: Integração com Heroku, simples

**Passo a passo:**

1. Heroku Dashboard → Resources
2. Add-ons → Heroku Postgres
3. Copiar DATABASE_URL

```bash
# Exemplo
DATABASE_URL=postgresql://user:password@ec2-xxxxx.compute-1.amazonaws.com:5432/database_name
```

## Opções de Connection String

### SSL/TLS

```bash
# Desabilitar SSL (apenas local/desenvolvimento)
?sslmode=disable

# Preferir SSL se disponível
?sslmode=prefer

# Exigir SSL (recomendado para produção)
?sslmode=require

# Exigir SSL com verificação de certificado
?sslmode=verify-full
```

### Timeout

```bash
# Timeout de conexão (em segundos)
?connect_timeout=10

# Timeout de statement (em segundos)
?statement_timeout=30000
```

### Pool de Conexões

```bash
# Tamanho máximo do pool
?max_pool_size=20

# Tamanho mínimo do pool
?min_pool_size=5
```

### Exemplo Completo

```bash
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require&connect_timeout=10&statement_timeout=30000
```

## Configuração em Docker Compose

### Usar banco externo

```yaml
# docker-compose.yml
services:
  app:
    environment:
      DATABASE_URL: postgresql://user:password@external-host:5432/db
```

### Usar banco local (PostgreSQL no Docker)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: nfc_management
      POSTGRES_USER: nfc_user
      POSTGRES_PASSWORD: sua_senha_aqui
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    environment:
      DATABASE_URL: postgresql://nfc_user:sua_senha_aqui@postgres:5432/nfc_management

volumes:
  postgres_data:
```

## Testes de Conexão

### Testar com psql

```bash
# Instalar psql
sudo apt install postgresql-client

# Testar conexão
psql "postgresql://user:password@host:5432/database"

# Comandos úteis
\l              # Listar bancos
\dt             # Listar tabelas
\du             # Listar usuários
\q              # Sair
```

### Testar com Node.js

```bash
# Criar arquivo test-db.js
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect()
  .then(() => {
    console.log('✅ Conexão bem-sucedida!');
    return client.query('SELECT NOW()');
  })
  .then(result => {
    console.log('Hora do servidor:', result.rows[0]);
    client.end();
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });
```

```bash
# Executar teste
node test-db.js
```

### Testar com Docker

```bash
# Testar conexão do container
docker-compose exec app node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => console.log('✅ OK'))
  .catch(e => console.error('❌', e.message));
"
```

## Troubleshooting

### Erro: "ECONNREFUSED"

**Causa**: Não consegue conectar ao servidor

**Solução**:
```bash
# Verificar host e porta
ping seu-host.com
telnet seu-host.com 5432

# Verificar firewall
sudo ufw allow 5432/tcp
```

### Erro: "FATAL: password authentication failed"

**Causa**: Senha incorreta

**Solução**:
```bash
# Verificar credenciais
# Resetar senha (se tiver acesso)
ALTER USER usuario WITH PASSWORD 'nova_senha';
```

### Erro: "database does not exist"

**Causa**: Banco não foi criado

**Solução**:
```bash
# Criar banco
createdb -U usuario nfc_management

# Ou via psql
psql -U postgres
CREATE DATABASE nfc_management;
```

### Erro: "SSL connection refused"

**Causa**: SSL não configurado corretamente

**Solução**:
```bash
# Tentar sem SSL
?sslmode=disable

# Ou com SSL
?sslmode=require
```

### Erro: "too many connections"

**Causa**: Pool de conexões cheio

**Solução**:
```bash
# Aumentar max_connections no PostgreSQL
ALTER SYSTEM SET max_connections = 200;

# Ou usar connection pooling (PgBouncer)
```

## Boas Práticas

1. **Use SSL em Produção**
   ```bash
   DATABASE_URL=postgresql://...?sslmode=require
   ```

2. **Senhas Fortes**
   - Mínimo 16 caracteres
   - Incluir maiúsculas, minúsculas, números, símbolos

3. **Backups Regulares**
   ```bash
   # Backup manual
   pg_dump "postgresql://..." > backup.sql

   # Restaurar
   psql "postgresql://..." < backup.sql
   ```

4. **Monitorar Conexões**
   ```sql
   SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
   ```

5. **Índices Apropriados**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   ```

## Próximos Passos

- [ ] Testar conexão com banco externo
- [ ] Executar migrações: `pnpm db:push`
- [ ] Fazer backup inicial
- [ ] Configurar alertas de conexão
- [ ] Monitorar performance
