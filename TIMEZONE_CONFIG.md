# Configuração de Timezone - Horário Padrão do Amazonas

## Visão Geral

Todo o sistema NFC Connect está configurado para usar o **Horário Padrão do Amazonas (UTC-4 / America/Manaus)** de forma consistente em todos os registros de data/hora.

## Timezone Utilizado

- **Nome**: America/Manaus (Horário Padrão do Amazonas)
- **Offset**: UTC-4 (4 horas atrás do UTC)
- **Observação**: Este timezone não possui horário de verão

## Funções Utilitárias

Todas as operações de data/hora devem usar as funções centralizadas em `server/utils/timezone.ts`:

### Funções Principais

```typescript
import { 
  getAmazonTime,           // Obter data/hora atual no timezone do Amazonas
  nowInAmazonTime,         // Alias para getAmazonTime() - para novos registros
  toAmazonTime,            // Converter qualquer Date para timezone do Amazonas
  getAmazonStartOfDay,     // Obter início do dia (00:00:00) no timezone do Amazonas
  getAmazonEndOfDay,       // Obter fim do dia (23:59:59.999) no timezone do Amazonas
  toAmazonISOString        // Converter Date para ISO string no timezone do Amazonas
} from './utils/timezone';
```

### Exemplos de Uso

```typescript
// ✅ CORRETO: Obter data/hora atual
const now = nowInAmazonTime();
const amazonTime = getAmazonTime();

// ✅ CORRETO: Obter início e fim do dia
const startOfDay = getAmazonStartOfDay();
const endOfDay = getAmazonEndOfDay();

// ✅ CORRETO: Converter data existente
const userDate = new Date(userInput);
const amazonDate = toAmazonTime(userDate);

// ✅ CORRETO: Para queries SQL
const today = getAmazonStartOfDay();
const todayISO = today.toISOString();

// ❌ ERRADO: Não usar new Date() diretamente
const now = new Date(); // Vai usar timezone do servidor, não do Amazonas
```

## Arquivos Atualizados

### Backend

1. **`server/utils/timezone.ts`** - Funções utilitárias centralizadas
2. **`server/db.ts`** - Todas as funções de banco de dados
3. **`server/routers.ts`** - Todos os endpoints tRPC
4. **`server/services/automaticCheckinCron.ts`** - Cron job de check-ins automáticos

### Funções Depreciadas

As seguintes funções foram marcadas como depreciadas e redirecionam para as novas funções:

- `getCampoGrandeTime()` → use `getAmazonTime()`

## Configuração do Cron Job

O cron job de check-ins automáticos está configurado para usar o timezone do Amazonas:

```typescript
cron.schedule('*/10 * * * *', async () => {
  await processAllActiveSchedules();
}, {
  scheduled: true,
  timezone: 'America/Manaus' // Amazon Standard Time (UTC-4)
});
```

## Configuração do Banco de Dados

### PostgreSQL/TiDB

Para garantir consistência, configure o timezone no banco de dados:

```sql
-- Configurar timezone padrão da sessão
SET TIME ZONE 'America/Manaus';

-- Ou configurar permanentemente no postgresql.conf
timezone = 'America/Manaus'
```

### Verificar Timezone Atual

```sql
SHOW timezone;
SELECT current_setting('TIMEZONE');
```

## Configuração do Servidor Node.js

Para configurar o timezone do servidor Node.js, adicione no início do arquivo principal:

```typescript
// No arquivo server/index.ts ou server/main.ts
process.env.TZ = 'America/Manaus';
```

Ou configure via variável de ambiente:

```bash
# No arquivo .env ou ao iniciar o servidor
TZ=America/Manaus node server/index.js

# Ou com pm2
pm2 start server/index.js --name nfcconect --env TZ=America/Manaus
```

## Testes

Para testar se o timezone está configurado corretamente:

```typescript
import { getTimezoneInfo } from './utils/timezone';

console.log(getTimezoneInfo());
// Output:
// {
//   timezone: 'America/Manaus (Amazon Standard Time)',
//   offset: 'UTC-4',
//   systemTime: '2024-01-15T14:30:00.000Z',
//   amazonTime: '2024-01-15T10:30:00.000Z',
//   dayOfWeek: 1,
//   minutesSinceMidnight: 630
// }
```

## Migração de Dados Existentes

Se houver dados existentes com timestamps incorretos, será necessário:

1. Identificar registros com timestamps no timezone errado
2. Converter para o timezone do Amazonas
3. Atualizar os registros no banco de dados

```sql
-- Exemplo: Atualizar timestamps para timezone do Amazonas
UPDATE checkins 
SET "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Manaus'
WHERE "createdAt" IS NOT NULL;
```

## Checklist de Implementação

- [x] Criar funções utilitárias em `server/utils/timezone.ts`
- [x] Atualizar `server/db.ts` para usar funções do Amazonas
- [x] Atualizar `server/routers.ts` para usar funções do Amazonas
- [x] Atualizar `server/services/automaticCheckinCron.ts` para usar timezone do Amazonas
- [ ] Configurar timezone no servidor Node.js (via TZ env var)
- [ ] Configurar timezone no banco de dados PostgreSQL/TiDB
- [ ] Testar todas as funcionalidades de data/hora
- [ ] Verificar se check-ins automáticos estão funcionando corretamente
- [ ] Verificar se estatísticas de "hoje" estão corretas

## Notas Importantes

1. **Consistência**: Sempre use as funções utilitárias, nunca `new Date()` diretamente
2. **Queries SQL**: Sempre converta Date para ISO string antes de usar em queries
3. **Cron Jobs**: Configure o timezone correto nas opções do cron
4. **Testes**: Sempre teste com dados de diferentes horários do dia
5. **Documentação**: Mantenha esta documentação atualizada com mudanças

## Suporte

Para dúvidas ou problemas relacionados ao timezone, consulte:
- Documentação do Node.js sobre timezones
- Documentação do PostgreSQL sobre timezone
- Biblioteca `node-cron` para configuração de timezone em cron jobs
