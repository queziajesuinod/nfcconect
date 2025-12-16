# Configuração Final - Seu Sistema NFC

Você já tem a API Key do Manus! Agora é só preencher o `.env.local` com suas credenciais.

## Sua API Key Manus

```
Chave: nfc-credential-key
Valor: sk-PZ********************Ykoaf
```

## Passo 1: Copiar Template

```bash
cd /home/ubuntu/nfc_management_system
cp .env.template .env.local
```

## Passo 2: Preencher .env.local

Abra o arquivo `.env.local` e preencha com:

### 1. DATABASE_URL (OBRIGATÓRIO)

**Sua connection string PostgreSQL:**
```bash
DATABASE_URL=postgresql://usuario:senha@host:porta/banco_dados
```

**Exemplos:**
- Railway: `postgresql://postgres:password@containers.railway.app:7890/railway`
- Render: `postgresql://user:password@dpg-xxx.render.com:5432/nfc_db`
- Local: `postgresql://postgres:password@localhost:5432/nfc_management`

### 2. VITE_APP_ID (OBRIGATÓRIO)

**Seu App ID do Manus:**
```bash
VITE_APP_ID=seu_app_id_aqui
```

Se não tiver, deixe em branco por enquanto. Você pode atualizar depois.

### 3. JWT_SECRET (OBRIGATÓRIO)

**Gere uma chave segura:**
```bash
# No terminal
openssl rand -base64 32
```

**Cole no .env.local:**
```bash
JWT_SECRET=sua_chave_gerada_aqui
```

### 4. OWNER_NAME (OBRIGATÓRIO)

```bash
OWNER_NAME=Seu Nome Completo
```

### 5. OWNER_OPEN_ID (OBRIGATÓRIO)

Seu ID no Manus (encontre em Settings → Profile)
```bash
OWNER_OPEN_ID=seu_user_id_aqui
```

### 6. Manus API (IMPORTANTE)

```bash
BUILT_IN_FORGE_API_URL=https://api.manus.ai
BUILT_IN_FORGE_API_KEY=sk-PZ********************Ykoaf
VITE_FRONTEND_FORGE_API_URL=https://api.manus.ai
VITE_FRONTEND_FORGE_API_KEY=sk-PZ********************Ykoaf
```

### 7. OAuth URLs (NÃO ALTERE)

```bash
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

## Passo 3: Arquivo .env.local Completo

```bash
# ============================================
# BANCO DE DADOS
# ============================================
DATABASE_URL=postgresql://usuario:senha@host:porta/banco_dados

# ============================================
# MANUS OAUTH
# ============================================
VITE_APP_ID=seu_app_id_aqui
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# ============================================
# MANUS API
# ============================================
BUILT_IN_FORGE_API_URL=https://api.manus.ai
BUILT_IN_FORGE_API_KEY=sk-PZ********************Ykoaf
VITE_FRONTEND_FORGE_API_URL=https://api.manus.ai
VITE_FRONTEND_FORGE_API_KEY=sk-PZ********************Ykoaf

# ============================================
# SEGURANÇA
# ============================================
JWT_SECRET=sua_chave_jwt_aqui

# ============================================
# INFORMAÇÕES DO PROPRIETÁRIO
# ============================================
OWNER_NAME=Seu Nome
OWNER_OPEN_ID=seu_user_id_aqui

# ============================================
# APLICAÇÃO
# ============================================
VITE_APP_TITLE=Sistema de Gerenciamento de Gravações NFC
VITE_APP_LOGO=/logo.png
NODE_ENV=development
```

## Passo 4: Testar Configuração

```bash
# Verificar se arquivo foi criado
ls -la .env.local

# Testar conexão com banco
pnpm db:push

# Iniciar servidor
pnpm dev
```

## Checklist Final

- [ ] `.env.local` criado
- [ ] `DATABASE_URL` preenchido
- [ ] `VITE_APP_ID` preenchido (ou deixado em branco)
- [ ] `JWT_SECRET` preenchido
- [ ] `OWNER_NAME` preenchido
- [ ] `OWNER_OPEN_ID` preenchido
- [ ] `BUILT_IN_FORGE_API_KEY` preenchido
- [ ] Arquivo salvo
- [ ] `pnpm db:push` executado com sucesso
- [ ] `pnpm dev` iniciado sem erros

## Próximos Passos

1. ✅ Preencher `.env.local`
2. ⏭️ Executar `pnpm db:push` para criar tabelas
3. ⏭️ Executar `pnpm dev` para iniciar servidor
4. ⏭️ Acessar http://localhost:3000
5. ⏭️ Testar login
6. ⏭️ Fazer deploy em produção

## Troubleshooting

### Erro: "DATABASE_URL is not set"
```bash
# Verificar se .env.local existe
cat .env.local | grep DATABASE_URL
```

### Erro: "Cannot connect to database"
```bash
# Testar conexão
psql "sua_database_url_aqui"
```

### Erro: "Invalid JWT_SECRET"
```bash
# Gerar nova chave
openssl rand -base64 32
```

### Servidor não reconhece mudanças
```bash
# Parar servidor (Ctrl + C)
# Reiniciar
pnpm dev
```

## Referências

- [DATABASE_CONFIGURATION.md](./DATABASE_CONFIGURATION.md) - Detalhes de connection strings
- [SETUP_ENV.md](./SETUP_ENV.md) - Guia detalhado de configuração
- [MANUS_CREDENCIAIS.md](./MANUS_CREDENCIAIS.md) - Como obter credenciais Manus
- [Documentação Manus](https://open.manus.ai/docs)
