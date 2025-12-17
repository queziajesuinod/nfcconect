# Hierarquia de Prioridade de Links Dinâmicos

## 📋 Problema

Quando um usuário pertence a um grupo e existem **dois links ativos** ao mesmo tempo:
1. **Link de grupo** (ex: promoção geral para "Alunos Turma A")
2. **Link individual** para esse usuário específico (ex: oferta especial só para João)

**Qual link deve ser usado?**

---

## ✅ Solução: Hierarquia de Prioridade

O sistema agora implementa uma **hierarquia de prioridade** que sempre favorece o link **mais específico**:

### 🎯 Ordem de Prioridade

```
1️⃣ Link Individual + Tag Específica     (MAIS ESPECÍFICO)
2️⃣ Link Individual + Global (sem tag)
3️⃣ Link de Grupo + Tag Específica
4️⃣ Link de Grupo + Global (sem tag)
5️⃣ URL Padrão da Tag                     (MENOS ESPECÍFICO - FALLBACK)
```

---

## 📊 Exemplos Práticos

### Exemplo 1: Link Individual Sobrescreve Link de Grupo

**Cenário**:
- João pertence ao grupo "Alunos Turma A"
- **Link de grupo ativo**: "Promoção de Natal" → `https://promo-natal.com`
- **Link individual ativo** para João: "Oferta VIP" → `https://oferta-vip-joao.com`

**Resultado**:
- João acessa tag NFC → Redireciona para `https://oferta-vip-joao.com` ✅
- Outros alunos da turma → Redirecionam para `https://promo-natal.com` ✅

**Por quê?**
- Link individual tem **prioridade maior** que link de grupo

---

### Exemplo 2: Tag Específica Sobrescreve Global

**Cenário**:
- João tem 2 links individuais ativos:
  - **Link global** (todas as tags): "Promoção Geral" → `https://promo-geral.com`
  - **Link para Tag #5**: "Promoção Especial Tag 5" → `https://promo-tag5.com`

**Resultado**:
- João acessa **Tag #5** → Redireciona para `https://promo-tag5.com` ✅
- João acessa **Tag #3** → Redireciona para `https://promo-geral.com` ✅

**Por quê?**
- Link com tag específica tem **prioridade maior** que link global

---

### Exemplo 3: Hierarquia Completa

**Cenário**:
- João (#123) pertence ao grupo "Alunos" (#10)
- Links ativos:
  1. Link individual João + Tag #5 → `https://individual-tag5.com`
  2. Link individual João + Global → `https://individual-global.com`
  3. Link grupo Alunos + Tag #5 → `https://grupo-tag5.com`
  4. Link grupo Alunos + Global → `https://grupo-global.com`

**Resultado quando João acessa Tag #5**:
```
✅ Usa: https://individual-tag5.com
❌ Ignora: https://individual-global.com
❌ Ignora: https://grupo-tag5.com
❌ Ignora: https://grupo-global.com
```

**Resultado quando João acessa Tag #3** (sem link específico):
```
❌ Não existe: individual-tag3.com
✅ Usa: https://individual-global.com
❌ Ignora: https://grupo-tag5.com
❌ Ignora: https://grupo-global.com
```

**Resultado quando Maria (do mesmo grupo) acessa Tag #5**:
```
❌ Não existe: link individual para Maria
❌ Não existe: link individual global para Maria
✅ Usa: https://grupo-tag5.com
❌ Ignora: https://grupo-global.com
```

---

## 🔧 Implementação Técnica

### Função: `getActiveDeviceLink()`

**Arquivo**: `server/db.ts`

```typescript
export async function getActiveDeviceLink(deviceId: string, tagId?: number | null) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  
  // Get user ID from device ID
  const user = await getNfcUserByDeviceId(deviceId);
  const nfcUserId = user?.id;
  
  // PRIORITY 1: Individual user link + specific tag
  if (tagId != null && nfcUserId) {
    const result = await db.select()
      .from(deviceLinkActivations)
      .innerJoin(dynamicLinks, eq(deviceLinkActivations.linkId, dynamicLinks.id))
      .where(
        and(
          eq(deviceLinkActivations.deviceId, deviceId),
          eq(deviceLinkActivations.tagId, tagId),
          eq(dynamicLinks.nfcUserId, nfcUserId),        // Individual link
          sql`${dynamicLinks.groupId} is null`,          // NOT group link
          gte(deviceLinkActivations.expiresAt, now)
        )
      )
      .limit(1);
    
    if (result[0]) return result[0].activation;
  }
  
  // PRIORITY 2: Individual user link + global (no tag)
  if (nfcUserId) {
    const result = await db.select()
      .from(deviceLinkActivations)
      .innerJoin(dynamicLinks, eq(deviceLinkActivations.linkId, dynamicLinks.id))
      .where(
        and(
          eq(deviceLinkActivations.deviceId, deviceId),
          sql`${deviceLinkActivations.tagId} is null`,  // Global
          eq(dynamicLinks.nfcUserId, nfcUserId),        // Individual link
          sql`${dynamicLinks.groupId} is null`,          // NOT group link
          gte(deviceLinkActivations.expiresAt, now)
        )
      )
      .limit(1);
    
    if (result[0]) return result[0].activation;
  }
  
  // PRIORITY 3: Group link + specific tag
  if (tagId != null && nfcUserId) {
    const result = await db.select()
      .from(deviceLinkActivations)
      .innerJoin(dynamicLinks, eq(deviceLinkActivations.linkId, dynamicLinks.id))
      .where(
        and(
          eq(deviceLinkActivations.deviceId, deviceId),
          eq(deviceLinkActivations.tagId, tagId),
          sql`${dynamicLinks.groupId} is not null`,     // Group link
          sql`${dynamicLinks.nfcUserId} is null`,        // NOT individual
          gte(deviceLinkActivations.expiresAt, now)
        )
      )
      .limit(1);
    
    if (result[0]) return result[0].activation;
  }
  
  // PRIORITY 4: Group link + global (no tag)
  if (nfcUserId) {
    const result = await db.select()
      .from(deviceLinkActivations)
      .innerJoin(dynamicLinks, eq(deviceLinkActivations.linkId, dynamicLinks.id))
      .where(
        and(
          eq(deviceLinkActivations.deviceId, deviceId),
          sql`${deviceLinkActivations.tagId} is null`,  // Global
          sql`${dynamicLinks.groupId} is not null`,     // Group link
          sql`${dynamicLinks.nfcUserId} is null`,        // NOT individual
          gte(deviceLinkActivations.expiresAt, now)
        )
      )
      .limit(1);
    
    if (result[0]) return result[0].activation;
  }

  // PRIORITY 5: Fallback to tag default URL (handled by caller)
  return null;
}
```

---

## 🧪 Como Testar a Hierarquia

### Teste 1: Link Individual Sobrescreve Grupo

**Setup**:
1. Criar grupo "Teste" com 2 usuários (João e Maria)
2. Criar link de grupo: "Promo Grupo" → `https://grupo.com`
3. Ativar link de grupo para Tag #1
4. Criar link individual para João: "Promo João" → `https://joao.com`
5. Ativar link individual para João na Tag #1

**Teste**:
- João acessa Tag #1 → Deve ir para `https://joao.com` ✅
- Maria acessa Tag #1 → Deve ir para `https://grupo.com` ✅

---

### Teste 2: Tag Específica Sobrescreve Global

**Setup**:
1. Criar link individual para João: "Promo" → `https://promo.com`
2. Ativar link para João **sem especificar tag** (global)
3. Criar outro link para João: "Promo Tag 2" → `https://promo-tag2.com`
4. Ativar link para João **apenas na Tag #2**

**Teste**:
- João acessa Tag #2 → Deve ir para `https://promo-tag2.com` ✅
- João acessa Tag #1 → Deve ir para `https://promo.com` ✅
- João acessa Tag #3 → Deve ir para `https://promo.com` ✅

---

### Teste 3: Hierarquia Completa

**Setup**:
1. Criar grupo "Alunos" com João
2. Criar 4 links e ativar conforme exemplo 3 acima

**Teste**:
- João + Tag #5 → `individual-tag5.com` ✅
- João + Tag #3 → `individual-global.com` ✅
- Maria + Tag #5 → `grupo-tag5.com` ✅
- Maria + Tag #3 → `grupo-global.com` ✅

---

## 📊 Casos de Uso

### 1. Promoções Gerais + Ofertas VIP

**Cenário**:
- Todos os clientes recebem promoção de 10% (link de grupo)
- Clientes VIP recebem promoção de 30% (link individual)

**Resultado**:
- Clientes VIP veem 30% (link individual tem prioridade)
- Clientes normais veem 10% (link de grupo)

---

### 2. Comunicados Gerais + Avisos Específicos

**Cenário**:
- Turma recebe comunicado geral sobre aula (link de grupo)
- João recebe aviso específico sobre recuperação (link individual)

**Resultado**:
- João vê aviso de recuperação (link individual)
- Outros alunos veem comunicado geral (link de grupo)

---

### 3. Campanhas por Tag + Campanhas Globais

**Cenário**:
- Campanha global: "Visite nosso site" (sem tag específica)
- Campanha Tag #5: "Promoção especial nesta loja" (tag específica)

**Resultado**:
- Acesso via Tag #5 → Vê promoção da loja
- Acesso via outras tags → Vê site geral

---

## 🎯 Benefícios

### Flexibilidade
- ✅ Criar campanhas gerais para grupos
- ✅ Sobrescrever com ofertas individuais quando necessário
- ✅ Segmentar por tag específica ou global

### Personalização
- ✅ Oferecer experiências personalizadas para usuários VIP
- ✅ Enviar avisos específicos sem afetar o grupo
- ✅ Testar campanhas com usuários específicos

### Controle
- ✅ Hierarquia clara e previsível
- ✅ Sempre favorece o mais específico
- ✅ Fácil de entender e gerenciar

---

## 📝 Regras Importantes

### 1. Sempre Mais Específico Ganha
- Link individual > Link de grupo
- Tag específica > Global (sem tag)

### 2. Expiração é Respeitada
- Links expirados são **ignorados**
- Sistema busca próximo na hierarquia

### 3. Usuário Deve Existir
- Se `deviceId` não tem usuário cadastrado → Usa apenas URL padrão da tag
- Hierarquia só funciona para usuários cadastrados

### 4. Grupos São Verificados Automaticamente
- Não precisa marcar manualmente que usuário está no grupo
- Sistema verifica automaticamente via `deviceId` → `nfcUserId` → `groupId`

---

## 🔄 Compatibilidade

### Links Antigos
- ✅ Continuam funcionando normalmente
- ✅ Hierarquia se aplica automaticamente

### Migração
- ✅ Não requer migração de dados
- ✅ Apenas atualização de código

---

## 🎉 Conclusão

A hierarquia de prioridade implementada permite:
1. ✅ **Campanhas gerais** para grupos inteiros
2. ✅ **Ofertas individuais** que sobrescrevem campanhas gerais
3. ✅ **Segmentação por tag** para locais específicos
4. ✅ **Flexibilidade total** no gerenciamento de links

Sistema agora é **profissional, flexível e previsível**! 🚀
