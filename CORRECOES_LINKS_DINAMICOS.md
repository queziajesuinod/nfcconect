# Correções Aplicadas - Links Dinâmicos

## Data: 17 de Dezembro de 2025

---

## 🎯 Objetivo

Implementar a funcionalidade de **sobrescrita de redirecionamento** via links dinâmicos quando há device e tag ativados.

---

## ✅ Correções Aplicadas

### Correção 1: Refatorar `getActiveDeviceLink()` com Prioridade de Links

**Localização**: `server/db.ts`, linha 534

#### Código Anterior (INCORRETO)
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

**Problemas**:
- ❌ Não recebia `tagId` como parâmetro
- ❌ Retornava qualquer link ativo do device, independente da tag
- ❌ Não implementava prioridade de links (específico vs. global)

#### Código Corrigido
```typescript
export async function getActiveDeviceLink(deviceId: string, tagId?: number | null) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  
  // Priority 1: Look for specific device + tag activation
  if (tagId != null) {
    const specificResult = await db.select()
      .from(deviceLinkActivations)
      .where(
        and(
          eq(deviceLinkActivations.deviceId, deviceId),
          eq(deviceLinkActivations.tagId, tagId),
          gte(deviceLinkActivations.expiresAt, now)
        )
      )
      .orderBy(desc(deviceLinkActivations.createdAt))
      .limit(1);
    
    if (specificResult[0]) {
      return specificResult[0];
    }
  }
  
  // Priority 2: Look for global device activation (tagId = null)
  const globalResult = await db.select()
    .from(deviceLinkActivations)
    .where(
      and(
        eq(deviceLinkActivations.deviceId, deviceId),
        sql`${deviceLinkActivations.tagId} is null`,
        gte(deviceLinkActivations.expiresAt, now)
      )
    )
    .orderBy(desc(deviceLinkActivations.createdAt))
    .limit(1);

  return globalResult[0] || null;
}
```

**Melhorias**:
- ✅ Aceita `tagId` opcional como parâmetro
- ✅ Implementa busca com prioridade:
  1. **Prioridade 1**: Link específico para `deviceId` + `tagId`
  2. **Prioridade 2**: Link global para `deviceId` (tagId = null)
- ✅ Filtra por expiração (`expiresAt >= now`)
- ✅ Retorna o link mais recente de cada categoria

---

### Correção 2: Integrar Links Dinâmicos em `checkByTagUid`

**Localização**: `server/routers.ts`, linhas 162-228

#### Mudanças Aplicadas

**Ponto 1: Usuário existente com relação à tag** (linha 190-200)
```typescript
// ANTES
return { 
  exists: true, 
  tag, 
  user: existingUser, 
  redirectUrl: tag.redirectUrl  // ❌ Sempre usa URL da tag
};

// DEPOIS
// Check for active dynamic link (priority: specific tag > global > tag default)
const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
const redirectUrl = activeLink?.targetUrl || tag.redirectUrl;

return { 
  exists: true, 
  tag, 
  user: existingUser, 
  redirectUrl  // ✅ Usa link dinâmico se disponível
};
```

**Ponto 2: Usuário existente sem relação à tag** (linha 213-223)
```typescript
// ANTES
return { 
  exists: true, 
  tag, 
  user: existingUser, 
  redirectUrl: tag.redirectUrl  // ❌ Sempre usa URL da tag
};

// DEPOIS
// Check for active dynamic link (priority: specific tag > global > tag default)
const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
const redirectUrl = activeLink?.targetUrl || tag.redirectUrl;

return { 
  exists: true, 
  tag, 
  user: existingUser, 
  redirectUrl  // ✅ Usa link dinâmico se disponível
};
```

**Resultado**:
- ✅ Endpoint `checkByTagUid` agora verifica links dinâmicos antes de retornar URL
- ✅ Prioriza link específico > link global > URL padrão da tag

---

### Correção 3: Integrar Links Dinâmicos em `register`

**Localização**: `server/routers.ts`, linhas 231-357

#### Mudanças Aplicadas

**Ponto 1: Usuário existente com relação** (linha 281-290)
```typescript
// ANTES
return { 
  isNewUser: false, 
  user: existingUser,
  tagId: tag.id,
  redirectUrl: tag.redirectUrl  // ❌ Sempre usa URL da tag
};

// DEPOIS
// Check for active dynamic link (priority: specific tag > global > tag default)
const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
const redirectUrl = activeLink?.targetUrl || tag.redirectUrl;

return { 
  isNewUser: false, 
  user: existingUser,
  tagId: tag.id,
  redirectUrl  // ✅ Usa link dinâmico se disponível
};
```

**Ponto 2: Usuário existente sem relação** (linha 305-314)
```typescript
// ANTES
return { 
  isNewUser: false,
  user: existingUser,
  tagId: tag.id,
  redirectUrl: tag.redirectUrl  // ❌ Sempre usa URL da tag
};

// DEPOIS
// Check for active dynamic link (priority: specific tag > global > tag default)
const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
const redirectUrl = activeLink?.targetUrl || tag.redirectUrl;

return { 
  isNewUser: false,
  user: existingUser,
  tagId: tag.id,
  redirectUrl  // ✅ Usa link dinâmico se disponível
};
```

**Ponto 3: Novo usuário** (linha 347-356)
```typescript
// ANTES
return { 
  isNewUser: true, 
  user: newUser,
  tagId: tag.id,
  redirectUrl: tag.redirectUrl  // ❌ Sempre usa URL da tag
};

// DEPOIS
// Check for active dynamic link (priority: specific tag > global > tag default)
const activeLink = await getActiveDeviceLink(input.deviceId, tag.id);
const redirectUrl = activeLink?.targetUrl || tag.redirectUrl;

return { 
  isNewUser: true, 
  user: newUser,
  tagId: tag.id,
  redirectUrl  // ✅ Usa link dinâmico se disponível
};
```

**Resultado**:
- ✅ Endpoint `register` agora verifica links dinâmicos em todos os cenários
- ✅ Funciona para usuários novos e existentes
- ✅ Funciona para primeira conexão e reconexões

---

### Correção 4: Atualizar `manualCheckin`

**Localização**: `server/routers.ts`, linha 783

#### Código Anterior
```typescript
const activation = await getActiveDeviceLink(nfcUser.deviceId);
```

#### Código Corrigido
```typescript
const activation = await getActiveDeviceLink(nfcUser.deviceId, input.tagId);
```

**Resultado**:
- ✅ Check-in manual agora considera a tag específica ao buscar link dinâmico
- ✅ Consistente com as outras correções

---

## 🔄 Lógica de Prioridade de Links

A nova implementação segue esta ordem de prioridade:

### 1. **Link Específico** (Prioridade Máxima)
- **Condição**: `deviceId` + `tagId` específico
- **Uso**: Campanhas direcionadas para uma tag específica
- **Exemplo**: Promoção apenas para Tag A

### 2. **Link Global** (Prioridade Média)
- **Condição**: `deviceId` + `tagId = null`
- **Uso**: Notificações para o usuário em qualquer tag
- **Exemplo**: Alerta urgente para todos os acessos do usuário

### 3. **URL Padrão da Tag** (Fallback)
- **Condição**: Nenhum link dinâmico ativo encontrado
- **Uso**: Redirecionamento normal da tag
- **Exemplo**: URL configurada na tag

---

## 📊 Cenários de Uso Agora Funcionais

### Cenário 1: Campanha Específica para Tag
```
Admin cria link dinâmico:
- deviceIds: ["device123", "device456"]
- tagIds: [1]  // Tag A
- targetUrl: "https://promo.com/campanha-tag-a"
- expiresAt: 2025-12-20

Resultado:
✅ Devices 123 e 456 acessam Tag A → redirecionam para campanha
✅ Devices 123 e 456 acessam Tag B → redirecionam normalmente
✅ Outros devices acessam Tag A → redirecionam normalmente
```

### Cenário 2: Notificação Global
```
Admin cria link dinâmico:
- deviceIds: ["device789"]
- tagIds: null  // Qualquer tag
- targetUrl: "https://notificacao.com/urgente"
- expiresAt: 2025-12-18

Resultado:
✅ Device 789 acessa qualquer tag → redireciona para notificação
✅ Outros devices → redirecionam normalmente
```

### Cenário 3: Link com Expiração
```
Admin cria link dinâmico:
- deviceIds: ["device999"]
- tagIds: [2]
- targetUrl: "https://oferta.com/24h"
- expiresAt: 2025-12-17 23:59:59

Resultado:
✅ Antes da expiração: device 999 + Tag 2 → redireciona para oferta
✅ Após expiração: device 999 + Tag 2 → redireciona normalmente
```

### Cenário 4: Prioridade de Links
```
Admin cria dois links para mesmo device:
1. Link específico: device123 + Tag A → "https://especifico.com"
2. Link global: device123 + null → "https://global.com"

Resultado:
✅ Device 123 acessa Tag A → redireciona para "https://especifico.com" (prioridade 1)
✅ Device 123 acessa Tag B → redireciona para "https://global.com" (prioridade 2)
✅ Device 123 acessa Tag C → redireciona para "https://global.com" (prioridade 2)
```

---

## 🧪 Como Testar

### Teste 1: Link Específico para Tag

**Preparação**:
1. Criar link dinâmico via admin
2. Associar a device específico e tag específica
3. Definir URL de destino

**Execução**:
1. Acessar tag NFC com device configurado
2. Verificar redirecionamento

**Resultado Esperado**:
- ✅ Redireciona para URL do link dinâmico
- ✅ Outros devices redirecionam normalmente
- ✅ Mesmo device em outras tags redireciona normalmente

### Teste 2: Link Global

**Preparação**:
1. Criar link dinâmico sem tag específica (tagIds vazio)
2. Associar a device específico
3. Definir URL de destino

**Execução**:
1. Acessar qualquer tag com device configurado
2. Verificar redirecionamento

**Resultado Esperado**:
- ✅ Redireciona para URL do link dinâmico em todas as tags
- ✅ Outros devices redirecionam normalmente

### Teste 3: Expiração de Link

**Preparação**:
1. Criar link dinâmico com expiração próxima (ex: 5 minutos)
2. Associar a device e tag
3. Definir URL de destino

**Execução**:
1. Acessar tag antes da expiração
2. Aguardar expiração
3. Acessar tag após expiração

**Resultado Esperado**:
- ✅ Antes: redireciona para URL do link dinâmico
- ✅ Depois: redireciona para URL padrão da tag

### Teste 4: Prioridade de Links

**Preparação**:
1. Criar link específico (device + tag A)
2. Criar link global (device + sem tag)
3. Ambos ativos

**Execução**:
1. Acessar tag A com device
2. Acessar tag B com device

**Resultado Esperado**:
- ✅ Tag A: usa link específico
- ✅ Tag B: usa link global

---

## 📁 Arquivos Modificados

### `server/db.ts`
- **Função modificada**: `getActiveDeviceLink()`
- **Mudanças**: 
  - Adicionado parâmetro `tagId?: number | null`
  - Implementada lógica de prioridade (específico > global)
  - Filtro por expiração mantido

### `server/routers.ts`
- **Endpoints modificados**:
  1. `nfcUsers.checkByTagUid` (2 pontos de retorno)
  2. `nfcUsers.register` (3 pontos de retorno)
  3. `checkins.manualCheckin` (1 ponto)

- **Mudanças**:
  - Adicionada verificação de link dinâmico antes de retornar `redirectUrl`
  - Implementada lógica: `activeLink?.targetUrl || tag.redirectUrl`
  - Comentários adicionados para clareza

---

## 📈 Impacto

### Funcionalidades Habilitadas
- ✅ Links dinâmicos específicos para tags funcionam
- ✅ Links dinâmicos globais funcionam
- ✅ Prioridade de links implementada corretamente
- ✅ Expiração de links respeitada
- ✅ Campanhas promocionais podem ser direcionadas
- ✅ Notificações urgentes via redirecionamento funcionam
- ✅ Grupos de notificação podem usar links dinâmicos

### Endpoints Afetados
- ✅ `nfcUsers.checkByTagUid` - Agora verifica links dinâmicos
- ✅ `nfcUsers.register` - Agora verifica links dinâmicos
- ✅ `checkins.manualCheckin` - Agora considera tag específica

### Compatibilidade
- ✅ **Backward compatible**: Parâmetro `tagId` é opcional
- ✅ Chamadas antigas sem `tagId` continuam funcionando (busca apenas global)
- ✅ Comportamento padrão (sem link dinâmico) não alterado

---

## 🎓 Lições Aprendidas

### 1. Sempre Considerar Contexto
- Links dinâmicos precisam considerar **device + tag** juntos
- Não basta filtrar apenas por device

### 2. Implementar Prioridade Clara
- Específico > Global > Padrão
- Documentar ordem de precedência

### 3. Manter Compatibilidade
- Parâmetros opcionais permitem migração gradual
- Código legado continua funcionando

### 4. Testar Todos os Cenários
- Usuário novo vs. existente
- Com relação vs. sem relação
- Link específico vs. global vs. nenhum

---

## ✅ Checklist de Validação

### Código
- [x] `getActiveDeviceLink()` refatorada com prioridade
- [x] `checkByTagUid` integrado (2 pontos)
- [x] `register` integrado (3 pontos)
- [x] `manualCheckin` atualizado
- [x] Todas as chamadas de `getActiveDeviceLink` atualizadas

### Documentação
- [x] Diagnóstico criado (`DIAGNOSTICO_LINKS_DINAMICOS.md`)
- [x] Correções documentadas (`CORRECOES_LINKS_DINAMICOS.md`)
- [x] Diff gerado (`dynamic_links_refactor.diff`)

### Testes (Pendente)
- [ ] Teste de link específico
- [ ] Teste de link global
- [ ] Teste de expiração
- [ ] Teste de prioridade
- [ ] Teste de compatibilidade

---

**Status**: ✅ Correções aplicadas com sucesso  
**Pronto para Teste**: Sim  
**Pronto para Deploy**: Após validação em desenvolvimento

---

**Última Atualização**: 17 de Dezembro de 2025
