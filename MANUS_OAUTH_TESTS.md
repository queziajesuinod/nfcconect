# Testes de OAuth do Manus

Guia com exemplos práticos para testar OAuth em desenvolvimento e produção.

## Testes em Desenvolvimento

### 1. Teste de Login Local

```bash
# Terminal 1: Iniciar servidor
cd /home/ubuntu/nfc_management_system
pnpm dev

# Terminal 2: Testar endpoint de login
curl -i http://localhost:3000/api/auth/login
```

### 2. Teste de Callback

```bash
# Simular callback do Manus (com authorization code fictício)
curl -i "http://localhost:3000/api/oauth/callback?code=test_code_123"

# Esperado: Redirecionamento para /dashboard
# Status: 302 Found
# Location: /dashboard
```

### 3. Teste de Sessão

```bash
# Após fazer login, verificar cookie
curl -i -c cookies.txt http://localhost:3000/api/trpc/auth.me

# Usar cookie em próxima requisição
curl -i -b cookies.txt http://localhost:3000/api/trpc/auth.me

# Esperado: Dados do usuário
# {"result":{"data":{"id":1,"name":"Seu Nome"}}}
```

### 4. Teste de Rota Protegida

```bash
# Sem autenticação (deve falhar)
curl http://localhost:3000/api/trpc/tags.list
# Esperado: {"error":"UNAUTHORIZED"}

# Com autenticação (deve funcionar)
curl -b cookies.txt http://localhost:3000/api/trpc/tags.list
# Esperado: {"result":{"data":[...]}}
```

## Testes em Produção

### 1. Teste de Conectividade

```bash
# Verificar se servidor está acessível
curl -i https://seu-dominio.com

# Esperado: Status 200
# Conteúdo: HTML da página inicial
```

### 2. Teste de OAuth Portal

```bash
# Verificar se Manus Portal é acessível
curl -i https://portal.manus.im

# Esperado: Status 200
# Redirecionamento para login
```

### 3. Teste de Callback em Produção

```bash
# Simular callback (com código fictício)
curl -i "https://seu-dominio.com/api/oauth/callback?code=test_code_123"

# Esperado: Redirecionamento
# Status: 302 Found
# Location: /dashboard
```

### 4. Teste de API Protegida

```bash
# Obter cookie de sessão (após login manual)
curl -i -c cookies.txt https://seu-dominio.com/api/trpc/auth.me

# Usar em próxima requisição
curl -i -b cookies.txt https://seu-dominio.com/api/trpc/tags.list

# Esperado: Dados do usuário e tags
```

## Teste Automatizado com Vitest

### 1. Teste de Autenticação

**Arquivo**: `server/auth.oauth.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { exchangeCodeForToken, verifyJWT } from "../_core/auth";

describe("OAuth Authentication", () => {
  describe("exchangeCodeForToken", () => {
    it("should exchange valid code for token", async () => {
      const code = "valid_test_code";
      
      // Mock Manus API
      vi.mock("../_core/fetch", () => ({
        fetch: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: "test_token_123",
            user: {
              id: "user_123",
              name: "Test User",
              email: "test@example.com"
            }
          })
        })
      }));

      const result = await exchangeCodeForToken(code);
      
      expect(result).toHaveProperty("access_token");
      expect(result.user.name).toBe("Test User");
    });

    it("should throw error for invalid code", async () => {
      const code = "invalid_code";
      
      await expect(exchangeCodeForToken(code)).rejects.toThrow();
    });
  });

  describe("verifyJWT", () => {
    it("should verify valid JWT", async () => {
      const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
      
      const payload = await verifyJWT(validToken);
      
      expect(payload).toHaveProperty("sub");
      expect(payload.sub).toBe("user_123");
    });

    it("should throw error for invalid JWT", async () => {
      const invalidToken = "invalid.jwt.token";
      
      await expect(verifyJWT(invalidToken)).rejects.toThrow();
    });

    it("should throw error for expired JWT", async () => {
      const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
      
      await expect(verifyJWT(expiredToken)).rejects.toThrow();
    });
  });
});
```

### 2. Teste de Callback

**Arquivo**: `server/oauth.callback.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createServer } from "http";
import request from "supertest";

describe("OAuth Callback", () => {
  let app: any;

  beforeEach(() => {
    app = createServer();
  });

  it("should handle callback with valid code", async () => {
    const response = await request(app)
      .get("/api/oauth/callback")
      .query({ code: "valid_code_123" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/dashboard");
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("should reject callback without code", async () => {
    const response = await request(app)
      .get("/api/oauth/callback");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("should set session cookie", async () => {
    const response = await request(app)
      .get("/api/oauth/callback")
      .query({ code: "valid_code_123" });

    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toContain("session=");
    expect(setCookie[0]).toContain("HttpOnly");
    expect(setCookie[0]).toContain("Secure");
  });
});
```

### 3. Teste de Proteção de Rota

**Arquivo**: `server/protected.route.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { protectedProcedure } from "../routers";
import { TRPCError } from "@trpc/server";

describe("Protected Routes", () => {
  it("should allow authenticated users", async () => {
    const ctx = {
      user: {
        id: 1,
        name: "Test User",
        email: "test@example.com"
      }
    };

    const result = await protectedProcedure
      .query(({ ctx }) => ctx.user)
      .createCaller(ctx)();

    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Test User");
  });

  it("should reject unauthenticated users", async () => {
    const ctx = { user: null };

    await expect(
      protectedProcedure
        .query(() => ({}))
        .createCaller(ctx)()
    ).rejects.toThrow(TRPCError);
  });
});
```

## Executar Testes

```bash
# Rodar todos os testes
pnpm test

# Rodar apenas testes de OAuth
pnpm test auth.oauth

# Rodar com coverage
pnpm test -- --coverage

# Modo watch (reexecuta ao salvar)
pnpm test -- --watch
```

## Teste Manual no Navegador

### 1. Teste de Login

```javascript
// Abrir DevTools (F12) e executar no Console:

// 1. Verificar se está deslogado
fetch("/api/trpc/auth.me")
  .then(r => r.json())
  .then(d => console.log("Antes:", d));

// 2. Fazer login (será redirecionado)
window.location.href = "/api/auth/login";

// 3. Após retornar, verificar se está logado
fetch("/api/trpc/auth.me")
  .then(r => r.json())
  .then(d => console.log("Depois:", d));
```

### 2. Teste de Cookie

```javascript
// Verificar cookie de sessão
console.log(document.cookie);

// Esperado: session=eyJhbGciOiJIUzI1NiI...

// Decodificar JWT (apenas para debug)
const token = document.cookie
  .split("; ")
  .find(row => row.startsWith("session="))
  ?.split("=")[1];

// Usar https://jwt.io para decodificar
```

### 3. Teste de Logout

```javascript
// Fazer logout
fetch("/api/auth/logout", { method: "POST" })
  .then(r => r.json())
  .then(d => console.log("Logout:", d));

// Verificar se cookie foi removido
console.log(document.cookie);

// Tentar acessar rota protegida
fetch("/api/trpc/tags.list")
  .then(r => r.json())
  .then(d => console.log("Acesso negado:", d));
```

## Checklist de Testes

- [ ] Login local funciona
- [ ] Callback recebe código
- [ ] Cookie de sessão é criado
- [ ] Rotas protegidas funcionam com autenticação
- [ ] Rotas protegidas rejeitam sem autenticação
- [ ] JWT é válido e não expirado
- [ ] Logout remove cookie
- [ ] Login em produção funciona
- [ ] Callback em produção funciona
- [ ] HTTPS está ativado
- [ ] Testes automatizados passam

## Troubleshooting de Testes

### Erro: "Cannot find module"

```bash
# Verificar imports
grep -r "import.*auth" server/

# Verificar se arquivo existe
ls -la server/_core/auth.ts
```

### Erro: "ECONNREFUSED"

```bash
# Verificar se servidor está rodando
pnpm dev

# Ou em produção
docker-compose ps
```

### Erro: "Invalid JWT"

```bash
# Verificar JWT_SECRET
echo $JWT_SECRET

# Regenerar se necessário
openssl rand -base64 32
```

## Próximos Passos

- [ ] Implementar testes de integração
- [ ] Adicionar testes de performance
- [ ] Configurar CI/CD com testes automáticos
- [ ] Monitorar taxa de sucesso de login
- [ ] Alertar em caso de múltiplas falhas
