# Como Criar Aplicação no Manus e Obter Credenciais

Guia passo a passo para criar uma aplicação no Manus e obter as credenciais necessárias.

## Passo 1: Acessar Manus

1. Abra seu navegador
2. Acesse: https://manus.im
3. Faça login com sua conta (ou crie uma se não tiver)

## Passo 2: Ir para Configurações

1. Clique no seu **perfil** (canto superior direito)
2. Selecione **Settings** ou **Configurações**
3. Procure por **Applications** ou **OAuth Apps**

## Passo 3: Criar Nova Aplicação

1. Clique em **New Application** ou **+ Criar Aplicação**
2. Preencha os dados:

| Campo | Valor | Exemplo |
|-------|-------|---------|
| **Nome** | Nome da sua aplicação | "Sistema de Gerenciamento NFC" |
| **Descrição** | O que a app faz | "Gerenciamento de tags NFC com check-in automático" |
| **URL do Site** | Seu domínio (ou localhost) | https://nfc.seu-dominio.com ou http://localhost:3000 |
| **Redirect URI** | URL de callback OAuth | https://nfc.seu-dominio.com/api/oauth/callback ou http://localhost:3000/api/oauth/callback |

## Passo 4: Obter as Credenciais

Após criar a aplicação, você receberá:

```
App ID:     abc123def456ghi789jkl012
App Secret: xyz789uvw456rst123opq890
```

**⚠️ IMPORTANTE**: Guarde o `App Secret` com segurança. Nunca o exponha publicamente!

## Passo 5: Copiar o App ID

1. Copie o **App ID**
2. Abra seu arquivo `.env.local`
3. Cole no campo `VITE_APP_ID`:

```bash
VITE_APP_ID=abc123def456ghi789jkl012
```

## Passo 6: Obter Seu Open ID (Opcional)

Se precisar do `OWNER_OPEN_ID`:

1. Vá para **Settings** → **Profile**
2. Procure por **Open ID** ou **User ID**
3. Copie e cole em `.env.local`:

```bash
OWNER_OPEN_ID=seu_open_id_aqui
```

## Configurações Importantes

### URL de Callback (Redirect URI)

A URL de callback deve estar **exatamente** como você configurou no Manus.

**Para desenvolvimento local:**
```
http://localhost:3000/api/oauth/callback
```

**Para produção:**
```
https://seu-dominio.com/api/oauth/callback
```

**Se mudar de domínio, ATUALIZE no Manus também!**

## Exemplo Completo

### No Manus Dashboard

```
Nome: Sistema de Gerenciamento NFC
Descrição: Gerenciamento de tags NFC com check-in automático
URL do Site: https://nfc.seu-dominio.com
Redirect URI: https://nfc.seu-dominio.com/api/oauth/callback
```

### No seu .env.local

```bash
VITE_APP_ID=abc123def456ghi789jkl012
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=user_123abc456def
```

## Troubleshooting

### Erro: "Invalid Redirect URI"

**Causa**: A URL de callback não corresponde ao registrado no Manus

**Solução**:
1. Verificar URL no Manus Dashboard
2. Verificar URL no seu código
3. Devem ser **exatamente** iguais

### Erro: "App ID not found"

**Causa**: `VITE_APP_ID` incorreto ou não definido

**Solução**:
1. Copiar App ID novamente do Manus
2. Verificar se não tem espaços extras
3. Reiniciar servidor

### Não consigo encontrar Applications

**Solução**:
1. Verificar se está logado no Manus
2. Ir para: https://manus.im/settings/applications
3. Ou procurar em Settings → Developer → Applications

## Próximos Passos

1. ✅ Criar aplicação no Manus
2. ✅ Obter App ID
3. ⏭️ Preencher `.env.local`
4. ⏭️ Executar `pnpm db:push`
5. ⏭️ Iniciar servidor: `pnpm dev`
6. ⏭️ Testar login

## Referências

- [SETUP_ENV.md](./SETUP_ENV.md) - Guia de configuração do .env
- [MANUS_OAUTH_PRODUCTION.md](./MANUS_OAUTH_PRODUCTION.md) - Detalhes de OAuth
- [Documentação Manus](https://docs.manus.im) - Documentação oficial
