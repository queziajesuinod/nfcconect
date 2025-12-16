# OAuth do Manus em Produção

Guia completo para configurar e usar OAuth do Manus em seu servidor de produção.

## Visão Geral

O OAuth do Manus permite que seus usuários façam login de forma segura usando suas credenciais Manus. Este guia cobre:

- ✅ Configuração no Manus Dashboard
- ✅ Variáveis de ambiente necessárias
- ✅ Fluxo de autenticação
- ✅ Testes e troubleshooting
- ✅ Boas práticas de segurança

## Arquitetura do Fluxo OAuth

```
┌─────────────────────────────────────────────────────────────┐
│                    Seu Aplicativo                           │
│              (nfc.seu-dominio.com)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. Usuário clica "Login"
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Manus Portal                              │
│              (portal.manus.im)                              │
│                                                              │
│  - Valida credenciais do usuário                            │
│  - Gera authorization code                                  │
│  - Redireciona para seu app                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 2. Redireciona com code
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         Seu Backend (/api/oauth/callback)                   │
│                                                              │
│  - Recebe authorization code                                │
│  - Troca code por token com Manus API                       │
│  - Cria sessão JWT local                                    │
│  - Redireciona para dashboard                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 3. Usuário autenticado
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Dashboard do Aplicativo                        │
│                                                              │
│  - Sessão JWT no cookie                                     │
│  - Acesso a recursos protegidos                             │
└─────────────────────────────────────────────────────────────┘
```

## Passo 1: Registrar Aplicação no Manus

### 1.1 Acessar Manus Dashboard

1. Acesse [https://manus.im](https://manus.im)
2. Faça login com sua conta
3. Vá para **Settings** → **Applications** (ou **OAuth Apps**)

### 1.2 Criar Nova Aplicação

Clique em **New Application** e preencha:

| Campo | Valor | Exemplo |
|-------|-------|---------|
| **Nome** | Nome da sua aplicação | "Sistema de Gerenciamento NFC" |
| **Descrição** | O que faz | "Gerenciamento de tags NFC com check-in automático" |
| **URL do Site** | Seu domínio | https://nfc.seu-dominio.com |
| **Redirect URI** | Endpoint de callback | https://nfc.seu-dominio.com/api/oauth/callback |

### 1.3 Obter Credenciais

Após criar, você receberá:

```
App ID:     abc123def456ghi789jkl012
App Secret: xyz789uvw456rst123opq890
```

**⚠️ IMPORTANTE**: Guarde o `App Secret` com segurança. Nunca o exponha publicamente.

## Passo 2: Configurar Variáveis de Ambiente

### 2.1 Em Desenvolvimento

```bash
# .env.local
VITE_APP_ID=abc123def456ghi789jkl012
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
JWT_SECRET=sua_chave_jwt_super_secreta_aqui_minimo_32_caracteres
```

### 2.2 Em Produção

```bash
# .env.production
VITE_APP_ID=abc123def456ghi789jkl012
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
JWT_SECRET=sua_chave_jwt_super_secreta_aqui_minimo_32_caracteres
```

### 2.3 Com Docker Compose

```bash
# .env.production
VITE_APP_ID=abc123def456ghi789jkl012
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
JWT_SECRET=sua_chave_jwt_super_secreta_aqui_minimo_32_caracteres
```

O docker-compose.yml já passa essas variáveis para o container.

## Passo 3: Entender o Fluxo de Código

### 3.1 Frontend - Iniciar Login

**Arquivo**: `client/src/lib/trpc.ts`

```typescript
// Obter URL de login
import { getLoginUrl } from "@/lib/auth";

const loginUrl = getLoginUrl();
// Resultado: https://portal.manus.im/oauth/authorize?...

// Redirecionar usuário
window.location.href = loginUrl;
```

### 3.2 Backend - Receber Callback

**Arquivo**: `server/_core/index.ts`

```typescript
// Rota de callback
app.get("/api/oauth/callback", async (req, res) => {
  const { code } = req.query;
  
  // Trocar code por token
  const token = await exchangeCodeForToken(code);
  
  // Criar sessão
  const session = createSession(token);
  
  // Redirecionar para dashboard
  res.redirect("/dashboard");
});
```

### 3.3 Verificar Autenticação

**Arquivo**: `server/_core/context.ts`

```typescript
// Cada requisição tRPC valida o JWT
export async function createContext(opts: CreateContextOptions) {
  const token = opts.req?.cookies?.session;
  
  if (token) {
    const user = verifyJWT(token);
    return { user };
  }
  
  return { user: null };
}
```

### 3.4 Proteger Rotas

**Arquivo**: `server/routers.ts`

```typescript
// Rota pública
export const publicProcedure = t.procedure;

// Rota protegida (requer login)
export const protectedProcedure = t.procedure
  .use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx });
  });

// Uso
router.query("profile", protectedProcedure.query(({ ctx }) => {
  return ctx.user; // Só funciona se autenticado
}));
```

## Passo 4: Testar em Produção

### 4.1 Verificar Configuração

```bash
# SSH no servidor
ssh seu-usuario@seu-dominio.com

# Verificar variáveis
docker-compose exec app env | grep VITE_APP_ID
docker-compose exec app env | grep OAUTH_SERVER_URL

# Verificar logs
docker-compose logs -f app | grep -i oauth
```

### 4.2 Teste Manual

1. Abra seu navegador
2. Acesse `https://seu-dominio.com`
3. Clique em **Login**
4. Você será redirecionado para `portal.manus.im`
5. Faça login com suas credenciais Manus
6. Você será redirecionado de volta para seu app
7. Deve estar autenticado no dashboard

### 4.3 Verificar Sessão

```bash
# No navegador, abra DevTools (F12)
# Vá para Application → Cookies
# Procure por "session"
# Deve conter um JWT válido
```

### 4.4 Teste de API Protegida

```bash
# Terminal
curl -H "Cookie: session=SEU_JWT_AQUI" \
  https://seu-dominio.com/api/trpc/auth.me

# Resultado esperado:
# {"result":{"data":{"id":1,"name":"Seu Nome","email":"seu@email.com"}}}
```

## Passo 5: Troubleshooting

### Problema: "Invalid App ID"

**Causa**: `VITE_APP_ID` incorreto ou não definido

**Solução**:
```bash
# Verificar valor
docker-compose exec app env | grep VITE_APP_ID

# Comparar com Manus Dashboard
# Settings → Applications → Seu App → App ID

# Se diferente, atualizar .env.production e reiniciar
docker-compose restart app
```

### Problema: "Redirect URI mismatch"

**Causa**: URL de callback não registrada no Manus

**Solução**:
1. Ir para Manus Dashboard
2. Settings → Applications → Seu App
3. Editar **Redirect URI**
4. Adicionar: `https://seu-dominio.com/api/oauth/callback`
5. Salvar

### Problema: "Session cookie not set"

**Causa**: JWT_SECRET inválido ou não definido

**Solução**:
```bash
# Gerar novo JWT_SECRET
openssl rand -base64 32

# Atualizar .env.production
JWT_SECRET=novo_valor_aqui

# Reiniciar app
docker-compose restart app

# Limpar cookies no navegador
# DevTools → Application → Cookies → Delete All
```

### Problema: "Unauthorized" em rotas protegidas

**Causa**: Sessão expirada ou inválida

**Solução**:
```bash
# Fazer logout e login novamente
# Ou verificar JWT_SECRET (veja acima)

# Verificar tempo de expiração no código
# server/_core/auth.ts → SESSION_EXPIRY
```

### Problema: CORS error ao chamar API

**Causa**: Domínio não configurado corretamente

**Solução**:
```bash
# Verificar Traefik labels no docker-compose.yml
# Devem incluir seu domínio

# Verificar headers CORS
curl -i https://seu-dominio.com/api/trpc/auth.me
# Procurar por: Access-Control-Allow-Origin
```

## Passo 6: Segurança em Produção

### 6.1 Proteger App Secret

```bash
# NUNCA commitar credenciais
echo "VITE_APP_ID=..." >> .env.production
echo ".env.production" >> .gitignore

# Usar secrets do Docker Compose
# Ou variáveis de ambiente do servidor
```

### 6.2 HTTPS Obrigatório

```bash
# Traefik já redireciona HTTP → HTTPS
# Verificar em docker-compose.yml:
# - traefik.http.middlewares.https-redirect.redirectscheme.scheme=https
```

### 6.3 Validar JWT

```typescript
// server/_core/auth.ts
import { jwtVerify } from "jose";

export async function verifyJWT(token: string) {
  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );
    return verified.payload;
  } catch (error) {
    throw new Error("Invalid JWT");
  }
}
```

### 6.4 Expiração de Sessão

```typescript
// Sessão expira em 24 horas
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // ms

// Renovar ao fazer login
const expiresAt = Date.now() + SESSION_EXPIRY;
```

### 6.5 Refresh Token (Opcional)

Para sessões mais longas:

```typescript
// Gerar refresh token ao fazer login
const refreshToken = generateRefreshToken(user.id);
// Armazenar em banco de dados

// Usar refresh token para renovar sessão
// Sem pedir login novamente
```

## Passo 7: Monitoramento

### 7.1 Logs de Autenticação

```bash
# Ver logs de OAuth
docker-compose logs app | grep -i "oauth\|auth\|login"

# Ver tentativas de login falhadas
docker-compose logs app | grep -i "unauthorized\|invalid"
```

### 7.2 Alertas Recomendados

```bash
# Configurar alertas para:
# - Múltiplas tentativas de login falhadas
# - Tokens inválidos
# - Erros de conexão com Manus API
```

### 7.3 Métricas

```bash
# Rastrear:
# - Total de usuários autenticados
# - Taxa de sucesso de login
# - Tempo médio de autenticação
# - Erros de OAuth
```

## Passo 8: Atualizar Manus App (Quando Necessário)

Se precisar atualizar credenciais:

1. **Gerar novo App ID/Secret**
   - Manus Dashboard → Applications → Seu App → Regenerate

2. **Atualizar variáveis**
   ```bash
   # .env.production
   VITE_APP_ID=novo_app_id
   ```

3. **Reiniciar aplicação**
   ```bash
   docker-compose restart app
   ```

4. **Testar login**
   - Fazer logout
   - Fazer login novamente
   - Verificar se funciona

## Checklist de Deployment

- [ ] App registrado no Manus Dashboard
- [ ] App ID obtido
- [ ] Redirect URI configurado corretamente
- [ ] Variáveis de ambiente definidas
- [ ] JWT_SECRET gerado e seguro
- [ ] HTTPS ativado (Traefik)
- [ ] Teste de login funcionando
- [ ] Cookies sendo salvos corretamente
- [ ] Rotas protegidas funcionando
- [ ] Logs monitorados
- [ ] Backup de credenciais realizado

## Referências

- [Documentação Manus OAuth](https://docs.manus.im/oauth)
- [Código de Autenticação](../server/_core/auth.ts)
- [Configuração de Contexto](../server/_core/context.ts)
- [Routers tRPC](../server/routers.ts)

## Suporte

Se encontrar problemas:

1. Verificar logs: `docker-compose logs app`
2. Consultar este guia
3. Abrir issue no repositório
4. Contatar suporte Manus: support@manus.im
