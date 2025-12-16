# Setup JWT Puro no Windows

## Pré-requisitos

- Node.js 18+ (https://nodejs.org)
- pnpm (instalar com: `npm install -g pnpm`)
- PostgreSQL 12+ (ou acesso remoto ao servidor)
- Git (opcional)

## Passo 1: Clonar/Abrir Projeto

```bash
# Se ainda não tiver o projeto
git clone seu-repositorio nfc_management_system
cd nfc_management_system

# Ou se já tem o projeto
cd C:\Users\Quezia\Projetos\nfc_management_system
```

## Passo 2: Instalar Dependências

```bash
pnpm install
```

Isso vai instalar:
- `bcrypt` - Hash seguro de senhas
- `jose` - JWT (já estava instalado)
- Todas as outras dependências

## Passo 3: Configurar Variáveis de Ambiente

### Opção A: Criar arquivo `.env.local`

Crie arquivo `.env.local` na raiz do projeto:

```bash
# Database PostgreSQL
DATABASE_URL=postgresql://root:sua-senha@62.72.63.137:5432/iecg_bd

# JWT Secret (mude para valor aleatório em produção!)
JWT_SECRET=seu-secret-key-muito-seguro-aqui

# Node Environment
NODE_ENV=development

# (Opcional) Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua-chave-aqui
```

### Opção B: Usar arquivo `.env.template`

```bash
# Copiar template
copy .env.template .env.local

# Editar .env.local com seus valores
```

## Passo 4: Sincronizar Banco de Dados

```bash
# Executar migrações Drizzle
pnpm db:push

# Ou manualmente com script
pnpm run db:push
```

Isso vai:
1. Conectar ao PostgreSQL
2. Criar/atualizar tabelas no schema `dev_iecg`
3. Verificar integridade do banco

## Passo 5: Iniciar Servidor

### Opção A: Usar script (recomendado)

```bash
# No Windows CMD ou PowerShell
pnpm run dev

# Ou usando script batch (se criado)
dev.bat
```

### Opção B: Manualmente

```bash
# Definir NODE_ENV e iniciar
set NODE_ENV=development
pnpm run dev

# Ou com cross-env (multiplataforma)
cross-env NODE_ENV=development pnpm run dev
```

### Opção C: PowerShell

```powershell
$env:NODE_ENV = "development"
pnpm run dev
```

## Passo 6: Testar Servidor

Abra navegador e acesse:

```
http://localhost:3000
```

Você deve ver:
- Página inicial do sistema
- Link de login
- Status "Servidor rodando"

## Passo 7: Testar Login

### Preparar usuário de teste

Se não tiver usuário administrador, criar um:

```sql
-- Conectar ao PostgreSQL
psql -h 62.72.63.137 -U root -d iecg_bd

-- Criar perfil administrador (se não existir)
INSERT INTO dev_iecg."Perfis" (id, descricao, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Administrador', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Obter ID do perfil
SELECT id, descricao FROM dev_iecg."Perfis" WHERE descricao LIKE '%admin%';

-- Criar usuário de teste
INSERT INTO dev_iecg."Users" 
  (id, name, email, passwordHash, active, "perfilId", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'Admin Test', 'admin@test.com', '$2b$10$...', true, 'PERFIL_ID_AQUI', NOW(), NOW());
```

### Hash de senha

Para gerar hash bcrypt para teste:

```bash
# Usar Node.js REPL
node

# No REPL:
const bcrypt = require('bcrypt');
bcrypt.hash('senha123', 10).then(hash => console.log(hash));
```

Copiar o hash gerado e usar no INSERT acima.

### Fazer login

1. Abrir http://localhost:3000/login
2. Entrar com:
   - Email: `admin@test.com`
   - Senha: `senha123`
3. Você deve ser redirecionado para `/dashboard`

## Passo 8: Executar Testes

```bash
# Rodar todos os testes
pnpm test

# Rodar apenas testes de autenticação
pnpm test -- auth.test.ts

# Rodar com watch mode
pnpm test -- --watch
```

Você deve ver:
```
✓ server/routers/auth.test.ts (11)
  ✓ JWT Authentication
    ✓ Password Hashing with bcrypt (5)
    ✓ JWT Token Generation and Verification (5)
    ✓ Token Expiration (1)
    ✓ Authentication Flow (1)
```

## Troubleshooting

### Erro: "Cannot find module 'bcrypt'"

```bash
# Reinstalar bcrypt
pnpm remove bcrypt
pnpm add bcrypt
pnpm add -D @types/bcrypt
```

### Erro: "DATABASE_URL not set"

```bash
# Verificar arquivo .env.local
# Deve conter: DATABASE_URL=postgresql://...

# Ou definir variável de ambiente
set DATABASE_URL=postgresql://root:senha@62.72.63.137:5432/iecg_bd
```

### Erro: "Connection refused"

```bash
# Verificar se PostgreSQL está acessível
# Testar conexão
psql -h 62.72.63.137 -U root -d iecg_bd

# Se não funcionar, verificar:
# 1. IP e porta corretos
# 2. Firewall bloqueando
# 3. Credenciais corretas
```

### Porta 3000 já está em uso

```bash
# Servidor vai usar 3001 automaticamente
# Ou matar processo na porta 3000

# Windows CMD
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Token não está sendo salvo

```bash
# Verificar se cookies estão habilitados no navegador
# Verificar console do navegador (F12) para erros
# Verificar se HTTPS está sendo usado em produção
```

## Estrutura do Projeto

```
nfc_management_system/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx      # Página de login
│   │   │   └── ...
│   │   └── App.tsx
│   └── index.html
├── server/                    # Backend Node.js
│   ├── _core/
│   │   ├── jwt-auth.ts        # JWT + bcrypt
│   │   ├── context.ts         # Contexto tRPC
│   │   ├── sdk.ts             # Autenticação
│   │   └── ...
│   ├── routers/
│   │   ├── auth.ts            # Endpoints de login/logout
│   │   └── ...
│   └── db.ts
├── drizzle/
│   └── schema.ts              # Schema PostgreSQL
├── .env.local                 # Variáveis de ambiente
├── .env.template              # Template de .env
├── JWT_REFACTORING.md         # Documentação JWT
└── package.json
```

## Comandos Úteis

```bash
# Desenvolvimento
pnpm run dev              # Iniciar servidor em desenvolvimento
pnpm test                 # Rodar testes
pnpm test -- --watch     # Rodar testes com watch

# Banco de dados
pnpm db:push             # Sincronizar schema com banco
pnpm db:pull             # Puxar schema do banco
pnpm db:studio           # Abrir Drizzle Studio (GUI)

# Build
pnpm run build           # Build para produção
pnpm run preview         # Preview do build

# Linting
pnpm run lint            # Verificar erros de linting
pnpm run format          # Formatar código
```

## Próximos Passos

1. ✅ Setup JWT puro com bcrypt
2. ✅ Configurar PostgreSQL externo
3. ✅ Testar login/logout
4. ⬜ Implementar refresh tokens
5. ⬜ Adicionar 2FA (opcional)
6. ⬜ Deploy em produção

## Suporte

Se tiver problemas:

1. Verificar logs do servidor (console)
2. Verificar console do navegador (F12)
3. Verificar arquivo `.env.local`
4. Verificar conexão com PostgreSQL
5. Consultar `JWT_REFACTORING.md` para mais detalhes

## Segurança

⚠️ **Importante para Produção:**

1. Mudar `JWT_SECRET` para valor aleatório:
   ```bash
   # Gerar secret aleatório
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Usar HTTPS em produção

3. Configurar CORS adequadamente

4. Implementar rate limiting no login

5. Adicionar auditoria de login

Veja `JWT_REFACTORING.md` para checklist completo de segurança.
