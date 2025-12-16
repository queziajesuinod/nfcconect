# Guia de Configuração para Windows

Instruções para rodar o projeto no Windows CMD.

## Scripts Criados

Dois scripts `.bat` foram criados na raiz do projeto:

### 1. `dev.bat` - Iniciar Servidor

```bash
dev.bat
```

**O que faz:**
- Define `NODE_ENV=development`
- Inicia o servidor em http://localhost:3000
- Mantém o terminal aberto para logs

### 2. `db-push.bat` - Migrar Banco de Dados

```bash
db-push.bat
```

**O que faz:**
- Executa `pnpm db:push`
- Sincroniza schema com banco PostgreSQL
- Cria/atualiza tabelas

## Passo a Passo - Primeira Vez

### 1. Abrir CMD

```
Windows + R
cmd
Enter
```

### 2. Ir para pasta do projeto

```cmd
cd C:\Users\Quezia\Projetos\nfc_management_system
```

### 3. Executar migrações

```cmd
db-push.bat
```

**Esperado:**
```
14 tables
automatic_checkins 15 columns
checkin_schedules 11 columns
...
No schema changes, nothing to migrate 😴
```

### 4. Iniciar servidor

```cmd
dev.bat
```

**Esperado:**
```
Server running on http://localhost:3000/
```

### 5. Acessar aplicação

Abra seu navegador:
```
http://localhost:3000
```

## Uso Diário

### Para desenvolver

```cmd
dev.bat
```

### Para atualizar banco

```cmd
db-push.bat
```

### Para parar servidor

```
Ctrl + C
```

## Alternativa: Sem Scripts

Se preferir não usar scripts, use direto no CMD:

### Iniciar servidor

```cmd
set NODE_ENV=development && pnpm dev
```

### Migrar banco

```cmd
pnpm db:push
```

## Troubleshooting

### Erro: "pnpm: comando não encontrado"

**Solução**: Instalar pnpm globalmente

```cmd
npm install -g pnpm
```

### Erro: "Cannot connect to database"

**Solução**: Verificar `DATABASE_URL` em `.env.local`

```cmd
type .env.local | findstr DATABASE_URL
```

### Erro: "Node_modules não encontrado"

**Solução**: Instalar dependências

```cmd
pnpm install
```

### Porta 3000 já está em uso

**Solução**: Mudar porta em `server/_core/index.ts` ou matar processo

```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Estrutura do Projeto

```
nfc_management_system/
├── dev.bat              ← Script para iniciar servidor
├── db-push.bat          ← Script para migrações
├── .env.local           ← Suas credenciais (não commitar)
├── .env.template        ← Template (commitar)
├── package.json
├── drizzle/
│   └── schema.ts        ← Schema do banco
├── server/
│   ├── _core/
│   │   └── index.ts     ← Servidor Express
│   ├── db.ts            ← Funções de banco
│   └── routers.ts       ← APIs tRPC
├── client/
│   ├── src/
│   │   ├── pages/       ← Páginas React
│   │   ├── components/  ← Componentes
│   │   └── App.tsx      ← App principal
│   └── index.html
└── ... outros arquivos
```

## Próximos Passos

1. ✅ Criar `.env.local`
2. ✅ Executar `db-push.bat`
3. ✅ Executar `dev.bat`
4. ⏭️ Acessar http://localhost:3000
5. ⏭️ Testar login
6. ⏭️ Fazer deploy

## Referências

- [CONFIGURACAO_FINAL.md](./CONFIGURACAO_FINAL.md) - Configuração do .env
- [DATABASE_CONFIGURATION.md](./DATABASE_CONFIGURATION.md) - Detalhes do banco
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Deploy em produção
