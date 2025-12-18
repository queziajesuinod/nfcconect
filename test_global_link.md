# Teste de Debug - Links Dinâmicos Globais

## Cenário do Problema

Usuário ativa um link dinâmico para um dispositivo **sem selecionar nenhuma tag** (esperando que funcione globalmente para todas as tags), mas o link não é aplicado.

## Fluxo Atual

### 1. Frontend (Links.tsx linha 247)
```typescript
tagIds: tagIds.length ? tagIds : undefined
```
- Se nenhuma tag selecionada → envia `undefined`

### 2. Backend - Ativação (routers.ts linha 529)
```typescript
const tagList = input.tagIds?.length ? input.tagIds : [null];
```
- Se `tagIds` é `undefined` → `tagList = [null]` ✅
- Se `tagIds` é `[]` → `tagList = [null]` ✅

### 3. Backend - Salvar no Banco (routers.ts linha 532-539)
```typescript
await setActiveDeviceLink({
  deviceId,
  linkId: link.id,
  targetUrl: link.targetUrl,
  tagId: tagId ?? null,  // Linha 536: tagId será null
  nfcUserId: link.nfcUserId,
  expiresAt,
});
```
- Salva com `tagId = null` no banco ✅

### 4. Backend - Buscar Link Ativo (db.ts linha 542-590)
```typescript
export async function getActiveDeviceLink(deviceId: string, tagId?: number | null) {
  // Priority 1: Link with specific tag
  if (tagId != null) {
    // Procura link específico para a tag
    const specificTagResult = await db.select()...
    if (specificTagResult[0]) {
      return specificTagResult[0];
    }
  }
  
  // Priority 2: Link with global tag (no tag)
  const globalResult = await db.select()
    .where(
      and(
        eq(deviceLinkActivations.deviceId, deviceId),
        sql`${deviceLinkActivations.tagId} is null`,  // Linha 578
        gte(deviceLinkActivations.expiresAt, now)
      )
    )...
}
```

### 5. Frontend - Leitura da Tag NFC (routers.ts linha 176)
```typescript
const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
```
- **SEMPRE passa `tag.id`** (nunca null)

## Análise do Problema

A lógica **deveria funcionar** assim:
1. Usuário ativa link sem tags → salva com `tagId = null`
2. Usuário lê tag NFC → chama `getActiveDeviceLink(deviceId, tag.id)`
3. Função procura link específico para `tag.id` → não encontra
4. Função procura link global com `tagId = null` → **deveria encontrar**

## Possíveis Causas

### Hipótese 1: Problema na Query SQL
A query `sql\`${deviceLinkActivations.tagId} is null\`` pode não estar funcionando corretamente com o Drizzle ORM.

**Solução**: Usar `isNull()` do Drizzle em vez de SQL raw.

### Hipótese 2: Expiração do Link
O link pode ter expirado antes do teste.

**Verificação**: Checar se `expiresAt >= now`

### Hipótese 3: DeviceId Incorreto
O deviceId usado na ativação pode ser diferente do deviceId da leitura.

**Verificação**: Logar ambos os deviceIds

## Solução Proposta

Substituir a query SQL raw por função nativa do Drizzle:

```typescript
// ANTES (linha 578):
sql`${deviceLinkActivations.tagId} is null`

// DEPOIS:
isNull(deviceLinkActivations.tagId)
```

Isso garante que a verificação de NULL seja feita corretamente pelo ORM.
