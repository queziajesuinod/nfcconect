# Diagnóstico - Links Dinâmicos Não Sobrescrevem Redirecionamento

## Data: 17 de Dezembro de 2025

---

## 🎯 Problema Reportado

A função de link dinâmico deveria **sobrescrever o redirecionamento padrão da tag** quando há um device e tag ativados, mas isso **não está funcionando**.

---

## 🔍 Análise do Fluxo Atual

### 1. Estrutura de Dados

#### Tabela: `device_link_activations`
```typescript
{
  id: serial,
  deviceId: varchar(255),      // ID único do dispositivo
  linkId: integer,              // ID do link dinâmico
  nfcUserId: integer,           // ID do usuário NFC
  tagId: integer,               // ID da tag NFC (pode ser null)
  targetUrl: text,              // URL de destino do link dinâmico
  expiresAt: timestamp,         // Data de expiração da ativação
  createdAt: timestamp
}
```

**Constraints**:
- `device_tag_unique`: Combinação única de `deviceId` + `tagId`
- `device_null_unique`: `deviceId` único quando `tagId` é null

### 2. Funções Existentes

#### `setActiveDeviceLink()`
**Localização**: `server/db.ts`, linha 482

**Funcionalidade**:
- Salva ou atualiza a ativação de link dinâmico para um dispositivo
- Suporta dois modos:
  - **Sem tag específica** (`tagId = null`): Link ativo para qualquer tag
  - **Com tag específica** (`tagId != null`): Link ativo apenas para aquela tag

**Lógica de Conflito**:
```typescript
if (entry.tagId == null) {
  // Usa apenas deviceId como chave única
  onConflictDoUpdate({ target: deviceLinkActivations.deviceId })
} else {
  // Usa deviceId + tagId como chave única
  onConflictDoUpdate({ target: [deviceLinkActivations.deviceId, deviceLinkActivations.tagId] })
}
```

#### `getActiveDeviceLink(deviceId)`
**Localização**: `server/db.ts`, linha 534

**Funcionalidade**:
- Busca link ativo para um dispositivo
- Filtra por:
  - `deviceId` igual ao fornecido
  - `expiresAt >= now` (não expirado)
- Ordena por `createdAt DESC` e retorna o primeiro

**Problema Identificado**:
```typescript
const result = await db.select()
  .from(deviceLinkActivations)
  .where(
    and(
      eq(deviceLinkActivations.deviceId, deviceId),
      gte(deviceLinkActivations.expiresAt, now)
    )
  )
  .orderBy(desc(deviceLinkActivations.createdAt))
  .limit(1);
```

❌ **NÃO filtra por `tagId`** - retorna qualquer link ativo do device, independente da tag sendo acessada!

---

## 🐛 Problemas Identificados

### Problema 1: `checkByTagUid` não verifica link dinâmico

**Localização**: `server/routers.ts`, linhas 162-218

**Código Atual**:
```typescript
checkByTagUid: publicProcedure
  .input(z.object({ tagUid: z.string(), deviceId: z.string() }))
  .query(async ({ input, ctx }) => {
    const tag = await getNfcTagByUid(input.tagUid);
    // ... validações ...
    
    const existingUser = await getNfcUserByDeviceId(input.deviceId);
    if (existingUser) {
      // ... lógica de relação ...
      return { 
        exists: true, 
        tag, 
        user: existingUser, 
        redirectUrl: tag.redirectUrl  // ❌ SEMPRE retorna redirectUrl da tag
      };
    }
  })
```

**Problema**:
- ❌ Nunca chama `getActiveDeviceLink()`
- ❌ Sempre retorna `tag.redirectUrl`
- ❌ Link dinâmico é completamente ignorado

### Problema 2: `getActiveDeviceLink` não filtra por tag

**Localização**: `server/db.ts`, linha 534

**Código Atual**:
```typescript
export async function getActiveDeviceLink(deviceId: string) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const result = await db.select()
    .from(deviceLinkActivations)
    .where(
      and(
        eq(deviceLinkActivations.deviceId, deviceId),
        gte(deviceLinkActivations.expiresAt, now)
      )
    )
    .orderBy(desc(deviceLinkActivations.createdAt))
    .limit(1);

  return result[0] || null;
}
```

**Problema**:
- ❌ Não recebe `tagId` como parâmetro
- ❌ Não filtra por tag específica
- ❌ Retorna qualquer link ativo do device, mesmo que seja para outra tag

**Cenário de Falha**:
1. Device tem link ativo para Tag A
2. Usuário acessa Tag B
3. Sistema retorna link da Tag A (incorreto!)

### Problema 3: `register` também não verifica link dinâmico

**Localização**: `server/routers.ts`, linhas 220-332

**Código Atual**:
```typescript
register: publicProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ input, ctx }) => {
    // ... lógica de registro ...
    return { 
      isNewUser: true, 
      user: newUser,
      tagId: tag.id,
      redirectUrl: tag.redirectUrl  // ❌ SEMPRE retorna redirectUrl da tag
    };
  })
```

**Problema**:
- ❌ Mesmo problema do `checkByTagUid`
- ❌ Link dinâmico ignorado no fluxo de registro

---

## 📋 Fluxo Esperado vs. Fluxo Atual

### Fluxo Esperado (Correto)

1. **Usuário acessa tag NFC**
   - Frontend chama `checkByTagUid` com `tagUid` e `deviceId`

2. **Backend verifica link dinâmico ativo**
   - Busca link ativo para `deviceId` + `tagId`
   - Se encontrado e não expirado: **usa `targetUrl` do link dinâmico**
   - Se não encontrado: usa `redirectUrl` padrão da tag

3. **Frontend redireciona**
   - Usa URL retornada (link dinâmico ou padrão da tag)

### Fluxo Atual (Incorreto)

1. **Usuário acessa tag NFC**
   - Frontend chama `checkByTagUid` com `tagUid` e `deviceId`

2. **Backend ignora link dinâmico**
   - ❌ Nunca busca link ativo
   - ❌ Sempre retorna `tag.redirectUrl`

3. **Frontend redireciona**
   - Sempre usa URL padrão da tag (link dinâmico não funciona!)

---

## 🎯 Casos de Uso de Links Dinâmicos

### Caso 1: Link Específico para Tag
**Cenário**: Campanha promocional para uma tag específica

- Admin cria link dinâmico para Tag A
- Associa device IDs específicos
- Quando esses devices acessam Tag A: redirecionam para campanha
- Quando acessam Tag B: redirecionam normalmente

**Status Atual**: ❌ Não funciona

### Caso 2: Link Global para Device
**Cenário**: Notificação urgente para usuários específicos

- Admin cria link dinâmico sem tag específica (`tagId = null`)
- Associa device IDs
- Quando esses devices acessam **qualquer tag**: redirecionam para notificação

**Status Atual**: ❌ Não funciona

### Caso 3: Link com Expiração
**Cenário**: Promoção por tempo limitado

- Admin cria link dinâmico com `expiresAt` = 1 hora
- Durante 1 hora: usuários redirecionam para promoção
- Após expiração: voltam ao redirecionamento normal

**Status Atual**: ❌ Não funciona (link nunca é verificado)

---

## ✅ Soluções Necessárias

### Solução 1: Refatorar `getActiveDeviceLink`

**Criar nova assinatura**:
```typescript
export async function getActiveDeviceLink(
  deviceId: string, 
  tagId?: number | null
): Promise<DeviceLinkActivation | null>
```

**Lógica**:
1. Buscar link específico para `deviceId` + `tagId` (se tagId fornecido)
2. Se não encontrado, buscar link global (`tagId = null`)
3. Filtrar por `expiresAt >= now`
4. Retornar o mais recente

### Solução 2: Integrar em `checkByTagUid`

**Adicionar verificação**:
```typescript
checkByTagUid: publicProcedure
  .query(async ({ input, ctx }) => {
    const tag = await getNfcTagByUid(input.tagUid);
    const existingUser = await getNfcUserByDeviceId(input.deviceId);
    
    // ✅ NOVO: Verificar link dinâmico ativo
    const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
    const redirectUrl = activeLink?.targetUrl || tag.redirectUrl;
    
    return { 
      exists: true, 
      tag, 
      user: existingUser, 
      redirectUrl  // ✅ Usa link dinâmico se disponível
    };
  })
```

### Solução 3: Integrar em `register`

**Mesma lógica**:
```typescript
register: publicProcedure
  .mutation(async ({ input, ctx }) => {
    // ... lógica de registro ...
    
    // ✅ NOVO: Verificar link dinâmico ativo
    const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
    const redirectUrl = activeLink?.targetUrl || tag.redirectUrl;
    
    return { 
      isNewUser: true, 
      user: newUser,
      tagId: tag.id,
      redirectUrl  // ✅ Usa link dinâmico se disponível
    };
  })
```

---

## 🔄 Prioridade de Links

**Ordem de precedência** (do mais específico ao mais geral):

1. **Link específico para device + tag** (`deviceId` + `tagId`)
   - Mais alta prioridade
   - Usado quando há campanha específica para aquela tag

2. **Link global para device** (`deviceId` + `tagId = null`)
   - Prioridade média
   - Usado quando há notificação para o usuário em qualquer tag

3. **Redirect URL padrão da tag** (`tag.redirectUrl`)
   - Menor prioridade (fallback)
   - Usado quando não há link dinâmico ativo

---

## 📊 Impacto

### Funcionalidades Afetadas
- ❌ Links dinâmicos não funcionam em nenhum cenário
- ❌ Campanhas promocionais não podem ser direcionadas
- ❌ Notificações urgentes não podem ser enviadas via redirecionamento
- ❌ Grupos de notificação baseados em agendamentos não podem usar links dinâmicos

### Usuários Afetados
- Administradores que criam links dinâmicos
- Usuários finais que deveriam ser redirecionados para conteúdo específico

---

## 📝 Arquivos a Modificar

1. **`server/db.ts`**
   - Refatorar `getActiveDeviceLink()` para aceitar `tagId` opcional
   - Implementar lógica de prioridade de links

2. **`server/routers.ts`**
   - Integrar verificação de link dinâmico em `checkByTagUid`
   - Integrar verificação de link dinâmico em `register`

---

## ✅ Próximos Passos

1. ✅ Diagnóstico completo
2. ⏳ Refatorar `getActiveDeviceLink()` com suporte a tagId
3. ⏳ Integrar verificação em `checkByTagUid`
4. ⏳ Integrar verificação em `register`
5. ⏳ Testar cenários de uso
6. ⏳ Documentar mudanças

---

**Status**: Diagnóstico completo ✅  
**Próxima Fase**: Refatoração das funções
