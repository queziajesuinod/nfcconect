# PostgreSQL Setup Guide

Este documento descreve como configurar o sistema de gerenciamento NFC para usar PostgreSQL em um servidor externo.

## Mudanças Realizadas

O sistema foi convertido de SQLite para PostgreSQL para permitir deploy em servidores externos:

### 1. Schema (drizzle/schema.ts)
- Convertido de `mysqlTable` para `pgTable`
- Convertido de `mysqlEnum` para `pgEnum`
- Convertido de `int()` para `serial()` para auto-increment
- Removido `.onUpdateNow()` do PostgreSQL (não suportado nativamente)

### 2. Driver de Banco de Dados (server/db.ts)
- Convertido de `drizzle-orm/mysql2` para `drizzle-orm/postgres-js`
- Adicionado import do driver `postgres`
- Convertido de `onDuplicateKeyUpdate` (MySQL) para `onConflictDoUpdate` (PostgreSQL)
- Adicionado `.returning()` em todas as operações de insert para retornar IDs
- Convertido de `.insertId` para `.id` para acessar IDs retornados

### 3. Dependências (package.json)
- Removido: `mysql2`
- Adicionado: `postgres` (driver PostgreSQL para Drizzle ORM)
- Mantido: `pg` (para compatibilidade com tipos TypeScript)

## Configuração do Banco de Dados

### Variáveis de Ambiente Necessárias

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

Exemplo:
```env
DATABASE_URL=postgresql://nfc_user:secure_password@db.example.com:5432/nfc_management
```

### Criar Banco de Dados PostgreSQL

```sql
-- Conectar como superuser (postgres)
CREATE DATABASE nfc_management;
CREATE USER nfc_user WITH PASSWORD 'secure_password';
ALTER ROLE nfc_user SET client_encoding TO 'utf8';
ALTER ROLE nfc_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE nfc_user SET default_transaction_deferrable TO on;
ALTER ROLE nfc_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE nfc_management TO nfc_user;
```

### Executar Migrações

```bash
# Gerar migrações
pnpm db:push

# Ou manualmente com drizzle-kit
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Deployment em Servidor Externo

### Opção 1: Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copiar package files
COPY package.json pnpm-lock.yaml ./

# Instalar dependências
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copiar código
COPY . .

# Build
RUN pnpm run build

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production

# Iniciar
CMD ["pnpm", "start"]
```

### Opção 2: Railway, Render, ou Heroku

1. Configurar PostgreSQL no provedor
2. Definir `DATABASE_URL` com a string de conexão
3. Definir outras variáveis de ambiente (OAuth, API keys, etc.)
4. Deploy do repositório

### Opção 3: VPS com Traefik

Veja `docker-compose.yml` para exemplo de setup com Traefik como reverse proxy.

## Diferenças PostgreSQL vs MySQL

| Aspecto | MySQL | PostgreSQL |
|--------|-------|-----------|
| Auto-increment | `autoincrement()` | `serial()` |
| Enum | `mysqlEnum()` | `pgEnum()` |
| Upsert | `onDuplicateKeyUpdate()` | `onConflictDoUpdate()` |
| Retornar IDs | `.insertId` | `.returning()` |
| Update automático | `.onUpdateNow()` | Manual com trigger |

## Verificação de Conexão

```bash
# Testar conexão
psql postgresql://user:password@host:port/database

# Listar tabelas
\dt

# Sair
\q
```

## Troubleshooting

### Erro: "Cannot find module 'postgres'"
```bash
pnpm install
```

### Erro: "Database not available"
- Verificar `DATABASE_URL`
- Verificar credenciais PostgreSQL
- Verificar firewall/network access

### Erro: "relation does not exist"
- Executar `pnpm db:push` para criar tabelas
- Verificar se migrações foram aplicadas

## Performance e Otimizações

### Índices Recomendados

```sql
-- Índices para queries frequentes
CREATE INDEX idx_nfc_tags_uid ON nfc_tags(uid);
CREATE INDEX idx_nfc_users_device_id ON nfc_users(deviceId);
CREATE INDEX idx_checkins_tag_id ON checkins(tagId);
CREATE INDEX idx_checkins_user_id ON checkins(nfcUserId);
CREATE INDEX idx_connection_logs_tag_id ON connection_logs(tagId);
CREATE INDEX idx_user_location_updates_user_id ON user_location_updates(nfcUserId);
CREATE INDEX idx_automatic_checkins_schedule_id ON automatic_checkins(scheduleId);
CREATE INDEX idx_group_user_relations_group_id ON group_user_relations(groupId);
CREATE INDEX idx_group_schedule_relations_group_id ON group_schedule_relations(groupId);
```

### Backup e Restore

```bash
# Backup
pg_dump postgresql://user:password@host:port/database > backup.sql

# Restore
psql postgresql://user:password@host:port/database < backup.sql
```

## Suporte

Para problemas com PostgreSQL, consulte:
- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [Drizzle ORM PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
