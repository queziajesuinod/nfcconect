# Plano de Implementação: Check-in Automático por Proximidade

## 📋 Visão Geral

Implementar sistema de check-in automático que detecta quando um usuário está próximo de uma tag NFC e registra o check-in automaticamente, sem necessidade de leitura física da tag.

---

## ✅ Base Já Implementada

1. ✅ **Localização inicial capturada** (primeiro acesso via `/app?device=`)
2. ✅ **Endpoint de atualização de localização** (`userLocation.update`)
3. ✅ **Tabela de localização** (`user_location_updates`)
4. ✅ **Funções de busca** (`getUsersWithRecentLocation`, `getUsersByTagIdWithRecentLocation`)
5. ✅ **Tags têm latitude/longitude** (salvas no cadastro)
6. ✅ **Agendamentos de check-in** (horários configurados)

---

## 🎯 Objetivo

Quando um usuário está dentro do **raio de proximidade** de uma tag NFC durante um **período de agendamento ativo**, o sistema deve:
1. Detectar a proximidade automaticamente
2. Registrar check-in automático
3. Notificar o usuário (opcional)
4. Atualizar dashboard em tempo real

---

## 📐 Arquitetura da Solução

### Componentes Necessários

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (UserApp)                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Sincronização Automática de Localização (já existe)      │
│ 2. Service Worker para Background Sync (já existe)          │
│ 3. Notificação de Check-in Automático (novo)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (API)                             │
├─────────────────────────────────────────────────────────────┤
│ 1. Endpoint: processAutomaticCheckins (novo)                │
│ 2. Cálculo de Distância (Haversine) (novo)                  │
│ 3. Validação de Agendamento Ativo (já existe)               │
│ 4. Registro de Check-in Automático (já existe)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                            │
├─────────────────────────────────────────────────────────────┤
│ - user_location_updates (já existe)                          │
│ - tags (latitude, longitude) (já existe)                     │
│ - checkin_schedules (já existe)                              │
│ - automatic_checkins (já existe)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Fases de Implementação

### **Fase 1: Cálculo de Distância (Backend)**

**Objetivo**: Implementar função para calcular distância entre dois pontos geográficos.

#### 1.1. Adicionar Função Haversine

**Arquivo**: `server/db.ts`

```typescript
/**
 * Calculate distance between two geographic points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

**Teste**:
```typescript
// Campo Grande, MS
const lat1 = -20.4697;
const lon1 = -54.6201;

// 100m de distância
const lat2 = -20.4707;
const lon2 = -54.6201;

const distance = calculateDistance(lat1, lon1, lat2, lon2);
console.log(`Distance: ${distance.toFixed(2)}m`); // ~111m
```

---

### **Fase 2: Configuração de Raio de Proximidade**

**Objetivo**: Permitir configurar raio de proximidade por tag ou globalmente.

#### 2.1. Adicionar Campo ao Schema (Opcional)

**Arquivo**: `drizzle/schema.ts`

```typescript
export const tags = pgTable("tags", {
  // ... campos existentes
  proximityRadius: integer("proximity_radius").default(100), // metros
});
```

**Migration**:
```sql
ALTER TABLE tags ADD COLUMN proximity_radius INTEGER DEFAULT 100;
```

#### 2.2. Configuração Global (Alternativa)

Se preferir não adicionar ao schema, usar variável de ambiente:

**Arquivo**: `server/_core/env.ts`

```typescript
PROXIMITY_RADIUS_METERS: z.coerce.number().default(100),
```

**.env**:
```
PROXIMITY_RADIUS_METERS=100
```

**Recomendação**: Começar com configuração global (100m) e depois adicionar por tag se necessário.

---

### **Fase 3: Endpoint de Processamento (Backend)**

**Objetivo**: Criar endpoint que processa check-ins automáticos por proximidade.

#### 3.1. Adicionar Endpoint

**Arquivo**: `server/routers.ts`

```typescript
// Em schedules router
processAutomaticCheckins: publicProcedure
  .input(z.object({
    scheduleId: z.number(),
  }))
  .mutation(async ({ input }) => {
    const { scheduleId } = input;

    // 1. Buscar agendamento
    const schedule = await getCheckinScheduleById(scheduleId);
    if (!schedule) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
    }

    // 2. Verificar se está no período ativo
    const now = new Date();
    const isActive = isScheduleActive(schedule, now);
    if (!isActive) {
      return { processed: 0, message: 'Agendamento não está ativo no momento' };
    }

    // 3. Buscar tags associadas ao agendamento
    const tagRelations = await getScheduleTagRelations(scheduleId);
    if (tagRelations.length === 0) {
      return { processed: 0, message: 'Nenhuma tag associada ao agendamento' };
    }

    // 4. Para cada tag, buscar usuários próximos
    let processedCount = 0;
    const proximityRadius = ENV.PROXIMITY_RADIUS_METERS || 100;

    for (const relation of tagRelations) {
      const tag = await getTagById(relation.tagId);
      if (!tag || !tag.latitude || !tag.longitude) continue;

      // 5. Buscar usuários com localização recente (últimos 30 minutos)
      const usersWithLocation = await getUsersByTagIdWithRecentLocation(tag.id, 30);

      // 6. Calcular distância e registrar check-in se dentro do raio
      for (const { user, location } of usersWithLocation) {
        // Verificar se já tem check-in hoje
        const hasCheckin = await hasUserCheckinForScheduleToday(
          scheduleId,
          user.id,
          now
        );
        if (hasCheckin) continue;

        // Calcular distância
        const distance = calculateDistance(
          parseFloat(location.latitude),
          parseFloat(location.longitude),
          parseFloat(tag.latitude),
          parseFloat(tag.longitude)
        );

        console.log(`[Auto Check-in] User ${user.name} is ${distance.toFixed(2)}m from tag ${tag.uid}`);

        // Se dentro do raio, registrar check-in
        if (distance <= proximityRadius) {
          await createAutomaticCheckin({
            scheduleId,
            nfcUserId: user.id,
            tagId: tag.id,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            distance: distance.toString(),
          });

          processedCount++;
          console.log(`[Auto Check-in] ✅ Check-in registered for ${user.name}`);
        }
      }
    }

    return {
      processed: processedCount,
      message: `${processedCount} check-in(s) automático(s) registrado(s)`,
    };
  }),
```

#### 3.2. Adicionar Funções Auxiliares

**Arquivo**: `server/db.ts`

```typescript
// Verificar se agendamento está ativo
export function isScheduleActive(schedule: CheckinSchedule, now: Date): boolean {
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

  // Verificar dia da semana
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayColumn = daysOfWeek[currentDay];
  if (!schedule[dayColumn]) return false;

  // Verificar horário
  if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
    return false;
  }

  return true;
}

// Buscar relações tag-agendamento
export async function getScheduleTagRelations(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(scheduleTagRelations)
    .where(eq(scheduleTagRelations.scheduleId, scheduleId));
}
```

---

### **Fase 4: Agendamento Automático (Cron Job)**

**Objetivo**: Executar processamento de check-ins automaticamente a cada X minutos.

#### 4.1. Opção A: Cron Job no Servidor

**Arquivo**: `server/cron.ts` (novo)

```typescript
import cron from 'node-cron';
import { getActiveCheckinSchedules, processAutomaticCheckinsForSchedule } from './db';

// Executar a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  console.log('[Cron] Running automatic check-in processor...');

  try {
    // Buscar agendamentos ativos
    const activeSchedules = await getActiveCheckinSchedules();

    for (const schedule of activeSchedules) {
      await processAutomaticCheckinsForSchedule(schedule.id);
    }

    console.log('[Cron] Automatic check-in processing completed');
  } catch (error) {
    console.error('[Cron] Error processing automatic check-ins:', error);
  }
});
```

**Instalar dependência**:
```bash
pnpm add node-cron
pnpm add -D @types/node-cron
```

**Inicializar no servidor**:

**Arquivo**: `server/index.ts`

```typescript
import './cron'; // Importar cron jobs
```

#### 4.2. Opção B: Endpoint Manual + Scheduler Externo

Se preferir controle externo (ex: cron do sistema operacional):

```bash
# Crontab
*/5 * * * * curl -X POST https://conecta.iecg.com.br/api/schedules/processAllAutomaticCheckins
```

---

### **Fase 5: Notificação ao Usuário (Frontend)**

**Objetivo**: Notificar usuário quando check-in automático é registrado.

#### 5.1. Adicionar Polling no Frontend

**Arquivo**: `client/src/pages/UserApp.tsx`

```typescript
// Verificar check-ins automáticos periodicamente
useEffect(() => {
  if (!deviceId) return;

  const checkAutomaticCheckins = async () => {
    try {
      // Buscar check-ins automáticos recentes (últimos 5 minutos)
      const recentCheckins = await trpc.checkins.getRecentAutomatic.query({
        deviceId,
        minutesAgo: 5,
      });

      // Se houver novos check-ins, notificar
      for (const checkin of recentCheckins) {
        if (!hasNotifiedCheckin(checkin.id)) {
          toast.success(`Check-in automático registrado! 📍 ${checkin.scheduleName}`);
          markCheckinAsNotified(checkin.id);

          // Notificação do navegador (se permitido)
          if (Notification.permission === 'granted') {
            new Notification('Check-in Automático', {
              body: `Você fez check-in em ${checkin.scheduleName}`,
              icon: '/icon-192.png',
            });
          }
        }
      }
    } catch (error) {
      console.error('[Auto Check-in] Error checking:', error);
    }
  };

  // Verificar a cada 2 minutos
  const interval = setInterval(checkAutomaticCheckins, 2 * 60 * 1000);
  checkAutomaticCheckins(); // Executar imediatamente

  return () => clearInterval(interval);
}, [deviceId]);

// Funções auxiliares
function hasNotifiedCheckin(checkinId: number): boolean {
  const notified = localStorage.getItem('notified_checkins') || '[]';
  return JSON.parse(notified).includes(checkinId);
}

function markCheckinAsNotified(checkinId: number): void {
  const notified = localStorage.getItem('notified_checkins') || '[]';
  const list = JSON.parse(notified);
  list.push(checkinId);
  localStorage.setItem('notified_checkins', JSON.stringify(list));
}
```

#### 5.2. Adicionar Endpoint de Check-ins Recentes

**Arquivo**: `server/routers.ts`

```typescript
getRecentAutomatic: publicProcedure
  .input(z.object({
    deviceId: z.string(),
    minutesAgo: z.number().default(5),
  }))
  .query(async ({ input }) => {
    const user = await getNfcUserByDeviceId(input.deviceId);
    if (!user) return [];

    const cutoffTime = new Date(Date.now() - input.minutesAgo * 60 * 1000);

    const checkins = await getAutomaticCheckinsByUserId(user.id, cutoffTime);
    return checkins;
  }),
```

---

### **Fase 6: Dashboard e Monitoramento**

**Objetivo**: Visualizar check-ins automáticos no dashboard.

#### 6.1. Adicionar Filtro no Dashboard

**Arquivo**: `client/src/pages/Dashboard.tsx`

```typescript
// Adicionar toggle para filtrar por tipo
const [checkinType, setCheckinType] = useState<'all' | 'manual' | 'automatic'>('all');

// Filtrar check-ins
const filteredCheckins = checkins.filter(checkin => {
  if (checkinType === 'manual') return checkin.type === 'manual';
  if (checkinType === 'automatic') return checkin.type === 'automatic';
  return true;
});
```

#### 6.2. Adicionar Badge Visual

```typescript
<div className="flex items-center gap-2">
  <span>{checkin.userName}</span>
  {checkin.type === 'automatic' && (
    <Badge variant="secondary" className="text-xs">
      <Navigation className="w-3 h-3 mr-1" />
      Automático
    </Badge>
  )}
</div>
```

---

## 📊 Fluxo Completo

### Exemplo Prático

**Cenário**:
- **Agendamento**: "Aula de Segunda" (08:00 - 10:00)
- **Tag**: "Sala 101" (lat: -20.4697, lon: -54.6201)
- **Raio**: 100 metros
- **Usuário**: João (deviceId: abc-123)

**Fluxo**:

1. **08:00** - João chega perto da Sala 101
2. **App de João** sincroniza localização automaticamente
3. **Backend** salva: João está em (-20.4705, -54.6201)
4. **Cron Job** executa (a cada 5 minutos)
5. **Sistema calcula** distância: 89 metros
6. **Sistema verifica**: Agendamento ativo? ✅ Sim (08:00-10:00, Segunda)
7. **Sistema verifica**: Já tem check-in hoje? ❌ Não
8. **Sistema registra**: Check-in automático para João
9. **App de João** recebe notificação: "Check-in automático registrado!"
10. **Dashboard** atualiza em tempo real

---

## ⚙️ Configurações Recomendadas

### Raio de Proximidade

| Ambiente | Raio Recomendado | Motivo |
|----------|------------------|--------|
| Sala de aula | 50-100m | Evitar check-ins de fora do prédio |
| Auditório | 100-200m | Área maior |
| Campus | 200-500m | Área ampla |
| Evento externo | 100-300m | Depende do local |

### Frequência de Verificação

| Intervalo | Uso | Prós | Contras |
|-----------|-----|------|---------|
| 1 minuto | Tempo real | Rápido | Alto consumo de recursos |
| 5 minutos | Recomendado | Balanceado | Atraso aceitável |
| 10 minutos | Econômico | Baixo consumo | Atraso perceptível |
| 15 minutos | Muito econômico | Mínimo consumo | Atraso significativo |

**Recomendação**: **5 minutos** para melhor balanço.

### Janela de Localização Recente

| Janela | Uso | Motivo |
|--------|-----|--------|
| 5 minutos | Muito restrito | Pode perder usuários |
| 15 minutos | Restrito | Boa precisão |
| 30 minutos | **Recomendado** | Balanço ideal |
| 60 minutos | Permissivo | Pode incluir usuários que já saíram |

---

## 🧪 Testes

### Teste 1: Distância Correta

```typescript
// Teste unitário
describe('calculateDistance', () => {
  it('should calculate distance correctly', () => {
    const lat1 = -20.4697;
    const lon1 = -54.6201;
    const lat2 = -20.4707;
    const lon2 = -54.6201;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    expect(distance).toBeCloseTo(111, 0); // ~111m
  });
});
```

### Teste 2: Check-in Dentro do Raio

```typescript
// Teste de integração
it('should register check-in when user is within radius', async () => {
  // Setup
  const tag = await createTag({ latitude: '-20.4697', longitude: '-54.6201' });
  const user = await createUser({ deviceId: 'test-123' });
  const schedule = await createSchedule({ /* ... */ });

  // Simular localização dentro do raio (50m)
  await updateUserLocation({
    nfcUserId: user.id,
    latitude: '-20.4702',
    longitude: '-54.6201',
  });

  // Executar processamento
  const result = await processAutomaticCheckins({ scheduleId: schedule.id });

  // Verificar
  expect(result.processed).toBe(1);
  const checkin = await getLatestCheckin(user.id);
  expect(checkin).toBeDefined();
  expect(checkin.type).toBe('automatic');
});
```

### Teste 3: Não Registrar Fora do Raio

```typescript
it('should NOT register check-in when user is outside radius', async () => {
  // Setup similar ao anterior

  // Simular localização fora do raio (200m)
  await updateUserLocation({
    nfcUserId: user.id,
    latitude: '-20.4715',
    longitude: '-54.6201',
  });

  // Executar processamento
  const result = await processAutomaticCheckins({ scheduleId: schedule.id });

  // Verificar
  expect(result.processed).toBe(0);
});
```

---

## 📈 Métricas e Monitoramento

### Logs Importantes

```typescript
console.log(`[Auto Check-in] Processing schedule ${scheduleId}`);
console.log(`[Auto Check-in] Found ${usersWithLocation.length} users with recent location`);
console.log(`[Auto Check-in] User ${user.name} is ${distance.toFixed(2)}m from tag`);
console.log(`[Auto Check-in] ✅ Check-in registered for ${user.name}`);
console.log(`[Auto Check-in] ❌ User ${user.name} outside radius (${distance.toFixed(2)}m)`);
```

### Dashboard de Estatísticas

Adicionar ao dashboard admin:
- Total de check-ins automáticos hoje
- Taxa de sucesso (automático vs manual)
- Distância média dos check-ins automáticos
- Usuários com localização ativa

---

## 🚀 Ordem de Implementação

### Sprint 1: Base (2-3 dias)
1. ✅ Função `calculateDistance()` (Haversine)
2. ✅ Configuração de raio de proximidade
3. ✅ Testes unitários de distância

### Sprint 2: Backend (3-4 dias)
1. ✅ Endpoint `processAutomaticCheckins`
2. ✅ Funções auxiliares (`isScheduleActive`, etc)
3. ✅ Testes de integração

### Sprint 3: Automação (2-3 dias)
1. ✅ Cron job ou scheduler
2. ✅ Logs e monitoramento
3. ✅ Testes de cron

### Sprint 4: Frontend (2-3 dias)
1. ✅ Notificações de check-in automático
2. ✅ Dashboard com filtros
3. ✅ Badges visuais

### Sprint 5: Testes e Ajustes (2-3 dias)
1. ✅ Testes end-to-end
2. ✅ Ajuste de raios e intervalos
3. ✅ Documentação final

**Total estimado**: 11-16 dias

---

## 🎯 Próximos Passos Imediatos

### 1. Decidir Configurações

- [ ] Raio de proximidade padrão (recomendo 100m)
- [ ] Intervalo de verificação (recomendo 5 minutos)
- [ ] Janela de localização recente (recomendo 30 minutos)

### 2. Implementar Fase 1

```bash
# Começar com função de cálculo de distância
# Arquivo: server/db.ts
```

### 3. Testar Manualmente

```bash
# Criar endpoint de teste
POST /api/schedules/testProximity
{
  "scheduleId": 1,
  "userId": 1,
  "tagId": 1
}
```

---

## 💡 Melhorias Futuras

### Fase Avançada 1: Geofencing
- Usar Geolocation API com `watchPosition()`
- Alertar usuário quando entrar/sair do raio
- Check-in instantâneo (sem esperar cron)

### Fase Avançada 2: Machine Learning
- Prever horários de chegada do usuário
- Sugerir melhor rota para check-in
- Detectar padrões de ausência

### Fase Avançada 3: Gamificação
- Pontos por check-ins automáticos
- Badges de frequência
- Ranking de presença

---

## 🎉 Conclusão

Com a base de localização implementada, o check-in por proximidade está **80% pronto**! 

Os próximos passos são:
1. ✅ Implementar cálculo de distância (Haversine)
2. ✅ Criar endpoint de processamento
3. ✅ Configurar cron job
4. ✅ Adicionar notificações

**Quer que eu comece a implementar agora?** 🚀
