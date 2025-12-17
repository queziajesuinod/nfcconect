# Diagnóstico de Erros - NFCConnect

## Data: 17 de Dezembro de 2025

---

## Resumo Executivo

Foram identificados **dois erros críticos** nas queries SQL que causam falhas de 500 (Internal Server Error) nas operações de estatísticas e check-in automático.

---

## Erro 1: stats.overview - Query de Check-ins de Hoje

### Localização
- **Arquivo**: `server/db.ts`
- **Linha**: 647
- **Função**: `getCheckinStats()`

### Problema Identificado
```typescript
const [todayCount] = await db.select({ count: sql<number>`count(*)` }).from(checkins)
  .where(sql`${checkins.createdAt} <= ${now}`);
```

**Operador incorreto**: A query usa `<=` (menor ou igual) quando deveria usar `>=` (maior ou igual).

### Impacto
- A query retorna **todos os check-ins** desde o início do banco de dados até agora, ao invés de apenas os check-ins de hoje
- Causa erro de lógica: a intenção é filtrar check-ins **desde o início do dia até agora**, mas o código atual filtra check-ins **desde sempre até agora**
- A variável `today` (linha 644-645) é calculada mas **nunca utilizada**

### Correção Necessária
```typescript
// Linha 644-645: today está definido mas não usado
const today = new Date(now);
today.setHours(0, 0, 0, 0);

// Linha 647: Corrigir para usar >= e a variável today
const [todayCount] = await db.select({ count: sql<number>`count(*)` }).from(checkins)
  .where(sql`${checkins.createdAt} >= ${today}`);
```

### Mensagem de Erro no Console
```
Failed query: select count(*) from "checkins" where "checkins"."createdAt" <= $1
params: Wed Dec 17 2025 15:35:13 GMT-0400 (Horário Padrão do Amazonas)
```

---

## Erro 2: schedules.triggerCheckin - Query de Localização de Usuários

### Localização
- **Arquivo**: `server/db.ts`
- **Linha**: 919
- **Função**: `getUsersByTagIdWithRecentLocation()`

### Problema Identificado
```typescript
const [latestLocation] = await db.select().from(userLocationUpdates)
  .where(and(
    eq(userLocationUpdates.nfcUserId, user.id),
    sql`${userLocationUpdates.createdAt} >= ${cutoffTime}`
  ))
  .orderBy(desc(userLocationUpdates.createdAt))
  .limit(1);
```

**Problema**: A query usa `sql` template literal para comparação de data, mas o parâmetro `cutoffTime` é um objeto `Date` JavaScript que precisa ser convertido corretamente pelo driver do banco de dados.

### Impacto
- Ao executar o check-in automático via `schedules.triggerCheckin`, a query falha ao tentar filtrar localizações recentes dos usuários
- Causa erro 500 no endpoint de trigger de check-in
- Impede a execução de check-ins automáticos baseados em proximidade

### Correção Necessária
Usar o operador `gte()` do Drizzle ORM ao invés de `sql` template literal:

```typescript
const [latestLocation] = await db.select().from(userLocationUpdates)
  .where(and(
    eq(userLocationUpdates.nfcUserId, user.id),
    gte(userLocationUpdates.createdAt, cutoffTime)
  ))
  .orderBy(desc(userLocationUpdates.createdAt))
  .limit(1);
```

### Mensagem de Erro no Console
```
Failed query: select "id", "nfcUserId", "latitude", "longitude", "accuracy", "deviceInfo", "createdAt" 
from "user_location_updates" 
where ("user_location_updates"."nfcUserId" = $1 and "user_location_updates"."createdAt" >= $2) 
order by "user_location_updates"."createdAt" desc limit $3
params: 1,Wed Dec 17 2025 14:40:18 GMT-0400 (Horário Padrão do Amazonas),1
```

---

## Análise de Causa Raiz

Ambos os erros têm a mesma causa raiz: **uso incorreto de comparações de data/timestamp em queries SQL**.

### Problema Comum
1. **Erro 1**: Operador de comparação invertido (`<=` ao invés de `>=`)
2. **Erro 2**: Uso de `sql` template literal ao invés de operadores nativos do Drizzle ORM

### Por que isso causa erro 500?
- O PostgreSQL/TiDB espera que os parâmetros de data sejam formatados corretamente
- Quando o Drizzle ORM não consegue converter o objeto `Date` JavaScript para o formato esperado pelo banco, a query falha
- O erro é propagado como 500 Internal Server Error para o cliente

---

## Recomendações

### Imediatas (Críticas)
1. ✅ Corrigir operador de comparação na linha 647 de `db.ts`
2. ✅ Substituir `sql` template por `gte()` na linha 919 de `db.ts`
3. ✅ Testar ambas as correções em ambiente de desenvolvimento

### Preventivas (Médio Prazo)
1. Implementar testes unitários para funções de query de data/timestamp
2. Adicionar validação de tipos TypeScript mais rigorosa para parâmetros de data
3. Documentar padrões de uso do Drizzle ORM para queries com datas
4. Implementar logging mais detalhado de queries SQL em desenvolvimento

### Boas Práticas
1. **Sempre usar operadores nativos do Drizzle ORM** (`gte`, `lte`, `eq`, etc.) ao invés de `sql` template literals
2. **Testar queries com datas** em diferentes timezones (especialmente Campo Grande MS - UTC-4)
3. **Validar variáveis calculadas** (como `today` no Erro 1) para garantir que sejam utilizadas

---

## Próximos Passos

1. ✅ Aplicar correções nos arquivos identificados
2. ✅ Validar que as queries funcionam corretamente
3. ✅ Testar endpoints afetados:
   - `stats.overview`
   - `schedules.triggerCheckin`
4. ✅ Verificar se há outros usos similares de comparações de data no código
5. ✅ Documentar as correções no histórico do projeto

---

## Arquivos Afetados

- `server/db.ts` (2 correções necessárias)
  - Linha 647: `getCheckinStats()`
  - Linha 919: `getUsersByTagIdWithRecentLocation()`

---

**Status**: Diagnóstico completo ✅  
**Próxima Fase**: Implementação das correções
