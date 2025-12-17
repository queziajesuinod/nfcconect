# Refatoração: Links Dinâmicos por Grupo

## 📋 Problema Anterior

Quando você criava um link dinâmico para um grupo:
- ❌ Sistema criava **1 link duplicado para CADA usuário** do grupo
- ❌ Para ativar, tinha que **ativar link por link** (muito trabalho!)
- ❌ Se grupo tinha 50 usuários = 50 links criados
- ❌ Difícil gerenciar e ativar campanhas para grupos grandes

## ✅ Solução Implementada

Agora o sistema funciona de forma otimizada:
- ✅ Criar link para grupo → **Cria apenas 1 link** associado ao grupo
- ✅ Para ativar → **Seleciona o grupo e ativa para todos de uma vez**
- ✅ Se grupo tem 50 usuários = 1 link criado
- ✅ Fácil gerenciar e ativar campanhas

---

## 🔧 Mudanças Técnicas

### 1. Schema do Banco de Dados

**Arquivo**: `drizzle/schema.ts`

```typescript
export const dynamicLinks = pgTable("dynamic_links", {
  id: serial("id").primaryKey(),
  nfcUserId: integer("nfcUserId"),        // Agora nullable
  groupId: integer("groupId"),            // NOVO campo
  shortCode: varchar("shortCode", { length: 32 }).notNull().unique(),
  targetUrl: text("targetUrl").notNull(),
  // ... outros campos
});
```

**Migration SQL**: `drizzle/migrations/0013_add_groupid_to_dynamic_links.sql`
- Adiciona coluna `groupId`
- Torna `nfcUserId` nullable
- Adiciona constraint: link deve ter OU `nfcUserId` OU `groupId` (não ambos)

---

### 2. Backend - Endpoint de Criação

**Arquivo**: `server/routers.ts` - Endpoint `links.create`

**Antes**:
```typescript
// Pegava todos os usuários do grupo
const groupMembers = await getGroupUsers(input.groupId);

// Criava 1 link para CADA usuário
for (const userId of targetUserIds) {
  const link = await createDynamicLink({
    nfcUserId: userId,  // Um link por usuário
    // ...
  });
}
```

**Depois**:
```typescript
// Se for grupo, cria APENAS 1 link
if (input.groupId) {
  const link = await createDynamicLink({
    groupId: input.groupId,  // Link associado ao grupo
    nfcUserId: null,
    // ...
  });
  
  return {
    createdLinks: [link],  // Apenas 1 link
    isGroupLink: true,
    groupMemberCount: groupMembers.length,
  };
}
```

---

### 3. Backend - Novo Endpoint de Ativação em Lote

**Arquivo**: `server/routers.ts` - Novo endpoint `links.activateForGroup`

```typescript
activateForGroup: adminProcedure
  .input(z.object({
    shortCode: z.string().min(1),
    tagIds: z.array(z.number()).optional(),
    expiresInMinutes: z.number().min(1).max(60).default(10),
  }))
  .mutation(async ({ input }) => {
    const link = await getDynamicLinkByShortCode(input.shortCode);
    
    // Verifica se é link de grupo
    if (!link.groupId) {
      throw new TRPCError({ message: "Use activateForDevice para links individuais" });
    }
    
    // Busca TODOS os usuários do grupo
    const groupMembers = await getGroupUsers(link.groupId);
    
    // Ativa para TODOS de uma vez
    for (const member of groupMembers) {
      const user = await getNfcUserById(member.nfcUserId);
      if (!user?.deviceId) continue;
      
      await setActiveDeviceLink({
        deviceId: user.deviceId,
        linkId: link.id,
        targetUrl: link.targetUrl,
        // ...
      });
    }
    
    return {
      groupMemberCount: groupMembers.length,
      activationCount,
    };
  })
```

---

### 4. Frontend - Interface Otimizada

**Arquivo**: `client/src/pages/Links.tsx`

#### 4.1. Indicador Visual de Link de Grupo

```tsx
<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
  {link.groupId ? (
    <span className="px-2 py-1 bg-blue-100 text-blue-800 font-bold rounded">
      GRUPO #{link.groupId}
    </span>
  ) : (
    <span>Usuário #{link.nfcUserId}</span>
  )}
</div>
```

#### 4.2. Dialog de Ativação Simplificado

**Para links de grupo**:
```tsx
{activationLink?.groupId && (
  <div className="p-4 bg-blue-50 border-2 border-blue-600 rounded">
    <p className="font-bold">👥 Link de Grupo - Ativação Automática</p>
    <p className="text-xs">
      Este link será ativado automaticamente para todos os usuários do grupo.
      Não é necessário selecionar dispositivos individualmente.
    </p>
  </div>
)}
```

**Para links individuais**:
- Mostra campo de seleção de dispositivos (como antes)

#### 4.3. Lógica de Ativação Inteligente

```typescript
const handleActivateForDevice = () => {
  // Se for link de grupo, usa endpoint de grupo
  if (activationLink.groupId) {
    activateGroupMutation.mutate({
      shortCode: activationLink.shortCode,
      tagIds: tagIds.length ? tagIds : undefined,
      expiresInMinutes: activationForm.expiresInMinutes,
    });
    return;
  }
  
  // Senão, usa endpoint individual (como antes)
  activateMutation.mutate({
    shortCode: activationLink.shortCode,
    deviceIds,
    tagIds,
    expiresInMinutes,
  });
};
```

---

## 🎯 Fluxo Completo - Antes vs Depois

### ANTES (Problemático)

1. **Criar link para grupo "Alunos Turma A"** (50 usuários)
   - Sistema cria 50 links duplicados
   - Banco fica cheio de registros duplicados

2. **Ativar link**
   - Precisa abrir cada um dos 50 links
   - Selecionar dispositivo manualmente
   - Clicar "Ativar" 50 vezes
   - ⏱️ Tempo: ~10 minutos

### DEPOIS (Otimizado)

1. **Criar link para grupo "Alunos Turma A"** (50 usuários)
   - Sistema cria apenas 1 link
   - Banco limpo e organizado

2. **Ativar link**
   - Abrir o link único
   - Clicar "Ativar para Grupo"
   - Sistema ativa automaticamente para os 50 usuários
   - ⏱️ Tempo: ~5 segundos

---

## 📊 Benefícios

### Performance
- ✅ **Menos registros no banco** (1 link ao invés de N)
- ✅ **Queries mais rápidas** (menos dados para processar)
- ✅ **Menos espaço em disco**

### Usabilidade
- ✅ **Ativação em 1 clique** ao invés de N cliques
- ✅ **Interface mais limpa** (menos links na lista)
- ✅ **Menos chance de erro** (não precisa ativar um por um)

### Manutenção
- ✅ **Fácil identificar links de grupo** (badge visual)
- ✅ **Fácil gerenciar campanhas** (1 link = 1 campanha)
- ✅ **Métricas agregadas** (clickCount do link = total do grupo)

---

## 🧪 Como Testar

### 1. Criar Link para Grupo

1. Ir em **Links Dinâmicos** → **Criar Novo Link**
2. Selecionar **Modo: Grupo**
3. Escolher um grupo (ex: "Alunos Turma A")
4. Preencher URL e título
5. Clicar **Criar Link**

**Resultado esperado**:
- ✅ Apenas 1 link criado
- ✅ Badge "GRUPO #X" aparece no link
- ✅ Mensagem de sucesso mostra quantidade de membros

### 2. Ativar Link para Grupo

1. Clicar em **Ativar** no link de grupo
2. Ver mensagem "👥 Link de Grupo - Ativação Automática"
3. Selecionar tags (opcional)
4. Definir tempo de expiração
5. Clicar **Ativar para Grupo**

**Resultado esperado**:
- ✅ Link ativado para todos os usuários do grupo
- ✅ Mensagem: "Link ativado para X usuários do grupo!"
- ✅ Todos os usuários do grupo podem acessar o link dinâmico

### 3. Verificar Funcionamento

1. Pegar device ID de um usuário do grupo
2. Acessar tag NFC com esse dispositivo
3. Verificar redirecionamento para URL do link dinâmico

**Resultado esperado**:
- ✅ Redireciona para URL do link dinâmico
- ✅ Contador de cliques incrementa
- ✅ Funciona para todos os usuários do grupo

---

## 🔄 Compatibilidade com Links Antigos

### Links Individuais Existentes
- ✅ Continuam funcionando normalmente
- ✅ Podem ser ativados como antes
- ✅ Sem necessidade de migração

### Novos Links Individuais
- ✅ Podem ser criados normalmente
- ✅ Funcionam exatamente como antes
- ✅ Interface mostra "Usuário #X" ao invés de "GRUPO #X"

---

## 📝 Notas Importantes

### Migration do Banco
- ⚠️ **Executar migration antes de usar**: `0013_add_groupid_to_dynamic_links.sql`
- ⚠️ Migration adiciona constraint: link deve ter OU userId OU groupId
- ✅ Links antigos continuam válidos (têm userId, groupId fica NULL)

### Comportamento de Ativação
- Links de **grupo**: Ativa para todos os dispositivos dos membros
- Links **individuais**: Ativa apenas para dispositivos selecionados
- Se usuário não tem `deviceId`: É pulado (não causa erro)

### Contador de Cliques
- Para links de grupo: Conta cliques de **todos os usuários**
- Métrica agregada do sucesso da campanha para o grupo

---

## 🎉 Conclusão

Esta refatoração resolve completamente o problema de gerenciamento de links para grupos, tornando o sistema:
- **Mais eficiente** (menos dados, mais rápido)
- **Mais fácil de usar** (ativação em 1 clique)
- **Mais escalável** (funciona bem com grupos grandes)

Agora você pode gerenciar campanhas para grupos de forma profissional e eficiente! 🚀
