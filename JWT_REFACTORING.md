# Refatoração para JWT Puro (Sem Manus OAuth)

## Visão Geral

O sistema foi completamente refatorado para usar **autenticação JWT pura com bcrypt**, removendo todas as dependências do Manus OAuth. A autenticação agora é baseada em:

- **JWT (JSON Web Tokens)** para sessões
- **bcrypt** para hash seguro de senhas
- **PostgreSQL** como banco de dados externo
- **Tabela Users existente** com campo `perfilId` para controle de acesso

## Mudanças Principais

### 1. Remoção de OAuth do Manus

**Arquivos removidos/desabilitados:**
- `server/_core/oauth.ts` - Rota de callback OAuth (não mais necessária)
- Referências a `OAUTH_SERVER_URL` e `VITE_OAUTH_PORTAL_URL` removidas do `.env`

**Arquivos atualizados:**
- `server/_core/index.ts` - Removido `registerOAuthRoutes(app)`
- `server/_core/env.ts` - Removidas variáveis de OAuth

### 2. Implementação de JWT com bcrypt

**Arquivo principal:** `server/_core/jwt-auth.ts`

```typescript
// Gerar token JWT
const token = await generateToken({
  userId: user.id,
  email: user.email,
  role: "admin"
});

// Verificar token
const payload = await verifyToken(token);

// Hash de senha com bcrypt
const hash = await hashPassword(plainPassword);

// Verificar senha
const isValid = await verifyPassword(plainPassword, hash);
```

**Características:**
- ✅ Tokens JWT com expiração de 7 dias
- ✅ bcrypt com 10 rounds de salt
- ✅ Suporte a async/await
- ✅ Seguro para produção

### 3. Autenticação com Perfil de Administrador

**Arquivo:** `server/routers/auth.ts`

O endpoint `auth.login` agora:

1. Busca usuário por email na tabela `Users`
2. Verifica senha com bcrypt
3. Valida se usuário está ativo
4. Busca perfil do usuário
5. Verifica se perfil contém "admin" na descrição
6. Gera JWT token se todas as validações passarem
7. Salva token em cookie httpOnly

**Fluxo de login:**

```typescript
POST /api/trpc/auth.login
{
  "email": "admin@example.com",
  "password": "senha123"
}

// Resposta (sucesso)
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User"
  }
}

// Resposta (erro - não é admin)
{
  "code": "FORBIDDEN",
  "message": "Apenas administradores podem acessar o sistema"
}
```

### 4. Estrutura de Banco de Dados

**Tabela Users (existente):**
```sql
CREATE TABLE dev_iecg."Users" (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  passwordHash VARCHAR(255),  -- Hash bcrypt
  active BOOLEAN DEFAULT true,
  perfilId UUID REFERENCES dev_iecg."Perfis"(id),
  username VARCHAR(255),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  telefone TEXT,
  cpf TEXT,
  endereco TEXT,
  estado_civil VARCHAR(50),
  nome_esposo VARCHAR(255),
  profissao VARCHAR(255),
  frequenta_celula BOOLEAN,
  batizado BOOLEAN,
  encontro VARCHAR(255),
  escolas TEXT
);
```

**Tabela Perfis (existente):**
```sql
CREATE TABLE dev_iecg."Perfis" (
  id UUID PRIMARY KEY,
  descricao VARCHAR(255),  -- Deve conter "admin" para acesso ao sistema
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 5. Variáveis de Ambiente

**Arquivo:** `.env.local` ou `.env.production`

```bash
# Database
DATABASE_URL=postgresql://user:password@62.72.63.137:5432/iecg_bd

# JWT Secret (mude em produção!)
JWT_SECRET=seu-secret-key-muito-seguro-aqui

# Node Environment
NODE_ENV=development

# (Opcional) Manus APIs para notificações, storage, etc
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua-chave-aqui
```

## Fluxo de Autenticação

### 1. Login

```
Usuário entra email/senha
        ↓
Sistema busca usuário no banco
        ↓
Valida senha com bcrypt
        ↓
Busca perfil do usuário
        ↓
Verifica se perfil é "Administrador"
        ↓
Gera JWT token (7 dias)
        ↓
Salva token em cookie httpOnly
        ↓
Redireciona para /dashboard
```

### 2. Requisições Autenticadas

```
Cliente envia requisição com cookie
        ↓
Middleware extrai token do cookie
        ↓
Verifica assinatura JWT
        ↓
Decodifica payload
        ↓
Busca usuário no banco
        ↓
Injeta user no contexto tRPC
        ↓
Procedimento protegido pode acessar ctx.user
```

### 3. Logout

```
Usuário clica "Sair"
        ↓
Endpoint auth.logout remove cookie
        ↓
Redireciona para home
        ↓
Próximas requisições retornam 401 (não autenticado)
```

## Testes

**Arquivo:** `server/routers/auth.test.ts`

Testes implementados (11 testes, todos passando):

- ✅ Hash de senha com bcrypt
- ✅ Verificação de senha correta
- ✅ Rejeição de senha incorreta
- ✅ Hashes diferentes para mesma senha
- ✅ Geração de JWT válido
- ✅ Verificação e decodificação de token
- ✅ Rejeição de token inválido
- ✅ Rejeição de token tamperado
- ✅ Claims iat e exp presentes
- ✅ Expiração em 7 dias
- ✅ Fluxo completo de autenticação

**Executar testes:**

```bash
pnpm test -- auth.test.ts
```

## Endpoints tRPC

### `auth.login`

**Input:**
```typescript
{
  email: string;      // Email do usuário
  password: string;   // Senha (mínimo 6 caracteres)
}
```

**Output:**
```typescript
{
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}
```

**Erros possíveis:**
- `UNAUTHORIZED` - Email ou senha inválidos
- `FORBIDDEN` - Usuário inativo ou não é administrador
- `INTERNAL_SERVER_ERROR` - Erro ao fazer login

### `auth.me`

**Input:** Nenhum

**Output:** Usuário autenticado ou null

```typescript
{
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  perfilId: string | null;
  // ... outros campos
}
```

### `auth.logout`

**Input:** Nenhum

**Output:**
```typescript
{
  success: boolean;
}
```

## Segurança

### Boas Práticas Implementadas

1. **bcrypt com 10 rounds de salt**
   - Protege contra ataques de força bruta
   - Lento por design (≈100ms por hash)

2. **JWT com assinatura HS256**
   - Token assinado com JWT_SECRET
   - Impossível falsificar sem a chave secreta

3. **Cookies httpOnly**
   - Token não acessível via JavaScript
   - Protege contra XSS

4. **SameSite=Lax**
   - Protege contra CSRF
   - Permite navegação de links externos

5. **Validação de Perfil**
   - Apenas usuários com perfil "Administrador" podem acessar
   - Validação feita no banco de dados

### Checklist de Segurança em Produção

- [ ] Mudar `JWT_SECRET` para valor aleatório e seguro
- [ ] Usar HTTPS em produção
- [ ] Configurar `CORS` adequadamente
- [ ] Implementar rate limiting no login
- [ ] Adicionar 2FA (autenticação de dois fatores)
- [ ] Implementar refresh tokens com rotação
- [ ] Adicionar auditoria de login
- [ ] Implementar logout em todos os dispositivos

## Migração de Dados

Se você tinha dados de usuários com senhas em formato diferente:

```typescript
// Script para migrar senhas antigas para bcrypt
import { hashPassword } from "./server/_core/jwt-auth";
import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function migratePasswords() {
  const db = await getDb();
  const allUsers = await db.select().from(users);
  
  for (const user of allUsers) {
    if (user.passwordHash && !user.passwordHash.startsWith("$2")) {
      // Não é bcrypt, converter
      const newHash = await hashPassword(user.passwordHash);
      await db
        .update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, user.id));
    }
  }
}
```

## Próximos Passos

1. **Testar login no navegador**
   - Acessar `http://localhost:3000/login`
   - Fazer login com usuário administrador
   - Verificar se token está no cookie

2. **Implementar Refresh Tokens** (opcional)
   - Adicionar tabela `refresh_tokens`
   - Renovar JWT automaticamente
   - Logout em todos os dispositivos

3. **Adicionar 2FA** (opcional)
   - Implementar TOTP (Google Authenticator)
   - Ou SMS/Email

4. **Auditoria de Login**
   - Registrar tentativas de login
   - Detectar atividade suspeita
   - Alertar usuário

## Troubleshooting

### "Email ou senha inválidos"

- Verificar se usuário existe no banco
- Verificar se senha está correta
- Verificar se usuário está ativo (`active = true`)

### "Apenas administradores podem acessar o sistema"

- Verificar se usuário tem `perfilId` atribuído
- Verificar se perfil tem "admin" na descrição
- Query para verificar:
  ```sql
  SELECT u.email, p.descricao 
  FROM dev_iecg."Users" u
  JOIN dev_iecg."Perfis" p ON u."perfilId" = p.id
  WHERE u.email = 'seu-email@example.com';
  ```

### Token expirado

- Token expira em 7 dias
- Usuário precisa fazer login novamente
- Implementar refresh tokens para renovação automática

### Cookie não está sendo salvo

- Verificar se `httpOnly` está habilitado
- Verificar se `SameSite` está configurado corretamente
- Verificar se HTTPS está sendo usado em produção

## Referências

- [JWT.io](https://jwt.io) - Documentação de JWT
- [bcrypt.js](https://github.com/dcodeIO/bcrypt.js) - Documentação de bcrypt
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
