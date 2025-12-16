# Como Obter Credenciais do Manus

Guia atualizado para obter credenciais no Manus (open.manus.ai).

## Passo 1: Acessar Manus

1. Abra seu navegador
2. Acesse: https://manus.im/app
3. Faça login com sua conta (ou crie uma se não tiver)

## Passo 2: Ir para Configurações de Integração

1. Clique em **Settings** (Configurações)
2. Procure por **API Integration** ou **Integrations**
3. Ou acesse diretamente: http://manus.im/app?show_settings=integrations&app_name=api

## Passo 3: Gerar API Key

1. Clique em **Generate New Key** ou **+ Create API Key**
2. Você receberá uma chave como:
   ```
   manus_api_key_abc123def456ghi789jkl012
   ```

## Passo 4: Copiar para .env.local

Abra seu arquivo `.env.local` e adicione:

```bash
# API Key do Manus
BUILT_IN_FORGE_API_KEY=manus_api_key_abc123def456ghi789jkl012

# URL da API Manus
BUILT_IN_FORGE_API_URL=https://api.manus.ai
VITE_FRONTEND_FORGE_API_URL=https://api.manus.ai
```

## Passo 5: Obter Informações de Perfil

Para obter `OWNER_OPEN_ID`:

1. Vá para **Settings** → **Profile** ou **Meu Perfil**
2. Procure por **User ID** ou **Open ID**
3. Copie e adicione ao `.env.local`:

```bash
OWNER_OPEN_ID=seu_user_id_aqui
```

## Configuração Completa do .env.local

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
BUILT_IN_FORGE_API_KEY=manus_api_key_abc123def456ghi789jkl012
VITE_FRONTEND_FORGE_API_URL=https://api.manus.ai
VITE_FRONTEND_FORGE_API_KEY=sua_frontend_key_aqui

# ============================================
# SEGURANÇA
# ============================================
JWT_SECRET=sua_chave_jwt_aqui

# ============================================
# INFORMAÇÕES DO PROPRIETÁRIO
# ============================================
OWNER_NAME=Seu Nome
OWNER_OPEN_ID=seu_user_id_aqui
```

## URLs Importantes

| Serviço | URL |
|---------|-----|
| **Manus App** | https://manus.im/app |
| **Manus API** | https://api.manus.ai |
| **Manus Docs** | https://open.manus.ai/docs |
| **Manus Quickstart** | https://open.manus.ai/docs/quickstart |
| **Gerar API Key** | http://manus.im/app?show_settings=integrations&app_name=api |

## Próximos Passos

1. ✅ Obter API Key do Manus
2. ✅ Preencher `.env.local`
3. ⏭️ Executar `pnpm db:push`
4. ⏭️ Iniciar servidor: `pnpm dev`
5. ⏭️ Testar sistema

## Referências

- [Documentação Manus](https://open.manus.ai/docs)
- [Quickstart Manus](https://open.manus.ai/docs/quickstart)
- [SETUP_ENV.md](./SETUP_ENV.md) - Guia de configuração do .env
