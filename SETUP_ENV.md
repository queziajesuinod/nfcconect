# Guia de Configuração do .env

Passo a passo para configurar o arquivo `.env` com suas credenciais.

## Passo 1: Copiar o Template

```bash
# Na pasta do projeto
cp .env.template .env.local
```

## Passo 2: Abrir o Arquivo

```bash
# Usar seu editor favorito
nano .env.local
# ou
code .env.local
# ou
vim .env.local
```

## Passo 3: Preencher as Variáveis

### 1. DATABASE_URL (OBRIGATÓRIO)

**O que é**: Connection string do seu banco PostgreSQL

**Onde encontrar**:
- **Railway**: Dashboard → Seu projeto → PostgreSQL → Connect → Database URL
- **Render**: Dashboard → Seu banco → Connect → External Connection String
- **Supabase**: Dashboard → Settings → Database → Connection String
- **AWS RDS**: RDS Dashboard → Seu banco → Endpoint + porta + credenciais
- **Local**: `postgresql://postgres:senha@localhost:5432/nfc_management`

**Exemplo**:
```
DATABASE_URL=postgresql://user:password@containers.railway.app:7890/railway
```

### 2. VITE_APP_ID (OBRIGATÓRIO)

**O que é**: ID da sua aplicação no Manus

**Onde encontrar**:
1. Acesse https://manus.im
2. Faça login
3. Vá para **Settings** → **Applications**
4. Clique em sua aplicação
5. Copie o **App ID**

**Exemplo**:
```
VITE_APP_ID=abc123def456ghi789jkl012
```

### 3. JWT_SECRET (OBRIGATÓRIO)

**O que é**: Chave secreta para assinar tokens JWT

**Como gerar**:
```bash
# Terminal
openssl rand -base64 32
```

**Exemplo**:
```
JWT_SECRET=aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
```

### 4. OWNER_NAME e OWNER_OPEN_ID (OBRIGATÓRIO)

**O que é**: Informações do proprietário da aplicação

**Onde encontrar**:
- **OWNER_NAME**: Seu nome completo
- **OWNER_OPEN_ID**: Seu ID no Manus (em Settings → Profile)

**Exemplo**:
```
OWNER_NAME=João Silva
OWNER_OPEN_ID=user_123abc456def
```

### 5. Variáveis Opcionais

Se não usar, deixe em branco ou comente com `#`:

```bash
# Não usar
# BUILT_IN_FORGE_API_KEY=sua_api_key_aqui

# Ou deixar vazio
BUILT_IN_FORGE_API_KEY=
```

## Passo 4: Salvar o Arquivo

- **Nano**: `Ctrl + O` → `Enter` → `Ctrl + X`
- **VS Code**: `Ctrl + S`
- **Vim**: `:wq` → `Enter`

## Passo 5: Testar a Configuração

```bash
# Verificar se arquivo foi criado
ls -la .env.local

# Verificar conteúdo (cuidado com dados sensíveis)
cat .env.local

# Testar conexão com banco
pnpm db:push
```

## Passo 6: Reiniciar o Servidor

```bash
# Parar servidor atual (Ctrl + C)

# Reiniciar
pnpm dev
```

## Checklist

- [ ] Arquivo `.env.local` criado
- [ ] DATABASE_URL preenchido
- [ ] VITE_APP_ID preenchido
- [ ] JWT_SECRET preenchido
- [ ] OWNER_NAME preenchido
- [ ] OWNER_OPEN_ID preenchido
- [ ] Arquivo salvo
- [ ] Servidor reiniciado
- [ ] Teste de conexão com banco passou

## Troubleshooting

### Erro: "DATABASE_URL is not set"

**Solução**: Verificar se `.env.local` foi criado e DATABASE_URL está preenchido

```bash
# Verificar
grep DATABASE_URL .env.local
```

### Erro: "Cannot connect to database"

**Solução**: Verificar connection string

```bash
# Testar conexão
psql "sua_database_url_aqui"
```

### Erro: "Invalid JWT_SECRET"

**Solução**: Regenerar com openssl

```bash
openssl rand -base64 32
```

### Servidor não reconhece mudanças no .env

**Solução**: Reiniciar servidor

```bash
# Parar (Ctrl + C)
# Reiniciar
pnpm dev
```

## Próximos Passos

1. ✅ Configurar `.env.local`
2. ⏭️ Executar migrações: `pnpm db:push`
3. ⏭️ Iniciar servidor: `pnpm dev`
4. ⏭️ Testar login
5. ⏭️ Fazer deploy

## Referências

- [DATABASE_CONFIGURATION.md](./DATABASE_CONFIGURATION.md) - Detalhes de connection strings
- [MANUS_OAUTH_PRODUCTION.md](./MANUS_OAUTH_PRODUCTION.md) - Configuração OAuth
- [.env.template](./.env.template) - Template completo
