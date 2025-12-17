# Exemplos de Uso: calculateDistance()

## 📖 Guia Rápido

Este documento mostra exemplos práticos de como usar a função `calculateDistance()` implementada na Sprint 1.

---

## 🎯 Exemplo 1: Verificação Simples de Proximidade

```typescript
import { calculateDistance } from './server/db';
import { ENV } from './server/_core/env';

// Tag: Sala 101 do IECG
const tagLatitude = -20.4697;
const tagLongitude = -54.6201;

// Usuário: João acabou de chegar
const userLatitude = -20.4705;
const userLongitude = -54.6201;

// Calcular distância
const distance = calculateDistance(
  tagLatitude,
  tagLongitude,
  userLatitude,
  userLongitude
);

console.log(`João está a ${distance.toFixed(2)}m da Sala 101`);
// Output: João está a 89.00m da Sala 101

// Verificar se está dentro do raio
const radius = ENV.proximityRadiusMeters; // 100m (padrão)

if (distance <= radius) {
  console.log('✅ João pode fazer check-in!');
} else {
  console.log(`❌ João está muito longe (${distance.toFixed(0)}m > ${radius}m)`);
}
// Output: ✅ João pode fazer check-in!
```

---

## 🎯 Exemplo 2: Encontrar Tag Mais Próxima

```typescript
import { calculateDistance } from './server/db';

interface Tag {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
}

function findNearestTag(
  userLat: number,
  userLon: number,
  tags: Tag[]
): { tag: Tag; distance: number } | null {
  let nearest: { tag: Tag; distance: number } | null = null;

  for (const tag of tags) {
    if (!tag.latitude || !tag.longitude) continue;

    const distance = calculateDistance(
      userLat,
      userLon,
      parseFloat(tag.latitude),
      parseFloat(tag.longitude)
    );

    if (!nearest || distance < nearest.distance) {
      nearest = { tag, distance };
    }
  }

  return nearest;
}

// Uso
const tags = [
  { id: 1, name: 'Sala 101', latitude: '-20.4697', longitude: '-54.6201' },
  { id: 2, name: 'Sala 102', latitude: '-20.4700', longitude: '-54.6201' },
  { id: 3, name: 'Auditório', latitude: '-20.4710', longitude: '-54.6201' },
];

const userLat = -20.4705;
const userLon = -54.6201;

const nearest = findNearestTag(userLat, userLon, tags);

if (nearest) {
  console.log(`Tag mais próxima: ${nearest.tag.name}`);
  console.log(`Distância: ${nearest.distance.toFixed(2)}m`);
}
// Output:
// Tag mais próxima: Sala 102
// Distância: 55.60m
```

---

## 🎯 Exemplo 3: Listar Todos os Usuários Próximos

```typescript
import { calculateDistance } from './server/db';

interface UserLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

function getUsersWithinRadius(
  tagLat: number,
  tagLon: number,
  users: UserLocation[],
  radius: number
): Array<UserLocation & { distance: number }> {
  return users
    .map(user => ({
      ...user,
      distance: calculateDistance(tagLat, tagLon, user.latitude, user.longitude)
    }))
    .filter(user => user.distance <= radius)
    .sort((a, b) => a.distance - b.distance); // Ordenar por distância
}

// Uso
const tagLat = -20.4697;
const tagLon = -54.6201;
const radius = 100; // metros

const users = [
  { id: 1, name: 'João', latitude: -20.4705, longitude: -54.6201 },
  { id: 2, name: 'Maria', latitude: -20.4715, longitude: -54.6201 },
  { id: 3, name: 'Pedro', latitude: -20.4700, longitude: -54.6201 },
  { id: 4, name: 'Ana', latitude: -20.4698, longitude: -54.6201 },
];

const nearbyUsers = getUsersWithinRadius(tagLat, tagLon, users, radius);

console.log(`Usuários dentro de ${radius}m:`);
nearbyUsers.forEach(user => {
  console.log(`- ${user.name}: ${user.distance.toFixed(2)}m`);
});
// Output:
// Usuários dentro de 100m:
// - Ana: 11.12m
// - Pedro: 33.36m
// - João: 89.00m
// (Maria não aparece, está a ~200m)
```

---

## 🎯 Exemplo 4: Verificar Múltiplas Tags

```typescript
import { calculateDistance } from './server/db';

interface Tag {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
}

function isUserNearAnyTag(
  userLat: number,
  userLon: number,
  tags: Tag[],
  radius: number
): { isNear: boolean; nearestTag?: Tag; distance?: number } {
  let nearestTag: Tag | undefined;
  let minDistance = Infinity;

  for (const tag of tags) {
    if (!tag.latitude || !tag.longitude) continue;

    const distance = calculateDistance(
      userLat,
      userLon,
      parseFloat(tag.latitude),
      parseFloat(tag.longitude)
    );

    if (distance <= radius && distance < minDistance) {
      minDistance = distance;
      nearestTag = tag;
    }
  }

  if (nearestTag) {
    return {
      isNear: true,
      nearestTag,
      distance: minDistance
    };
  }

  return { isNear: false };
}

// Uso
const scheduleId = 1;
const tags = await getScheduleTags(scheduleId); // Tags do agendamento

const userLat = -20.4705;
const userLon = -54.6201;
const radius = 100;

const result = isUserNearAnyTag(userLat, userLon, tags, radius);

if (result.isNear) {
  console.log(`✅ Usuário próximo de: ${result.nearestTag!.name}`);
  console.log(`   Distância: ${result.distance!.toFixed(2)}m`);
  // Pode registrar check-in
} else {
  console.log('❌ Usuário não está próximo de nenhuma tag');
}
```

---

## 🎯 Exemplo 5: Calcular Estatísticas de Distância

```typescript
import { calculateDistance } from './server/db';

interface CheckinWithDistance {
  userId: number;
  userName: string;
  tagId: number;
  tagName: string;
  userLat: number;
  userLon: number;
  tagLat: number;
  tagLon: number;
}

function calculateCheckinStats(checkins: CheckinWithDistance[]) {
  const distances = checkins.map(checkin =>
    calculateDistance(
      checkin.userLat,
      checkin.userLon,
      checkin.tagLat,
      checkin.tagLon
    )
  );

  const total = distances.length;
  const sum = distances.reduce((acc, d) => acc + d, 0);
  const average = sum / total;
  const min = Math.min(...distances);
  const max = Math.max(...distances);

  return {
    total,
    average: average.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    within50m: distances.filter(d => d <= 50).length,
    within100m: distances.filter(d => d <= 100).length,
    within200m: distances.filter(d => d <= 200).length,
  };
}

// Uso
const checkins = [
  { userId: 1, userName: 'João', tagId: 1, tagName: 'Sala 101', userLat: -20.4705, userLon: -54.6201, tagLat: -20.4697, tagLon: -54.6201 },
  { userId: 2, userName: 'Maria', tagId: 1, tagName: 'Sala 101', userLat: -20.4700, userLon: -54.6201, tagLat: -20.4697, tagLon: -54.6201 },
  { userId: 3, userName: 'Pedro', tagId: 1, tagName: 'Sala 101', userLat: -20.4698, userLon: -54.6201, tagLat: -20.4697, tagLon: -54.6201 },
];

const stats = calculateCheckinStats(checkins);

console.log('📊 Estatísticas de Check-ins:');
console.log(`Total: ${stats.total}`);
console.log(`Distância média: ${stats.average}m`);
console.log(`Distância mínima: ${stats.min}m`);
console.log(`Distância máxima: ${stats.max}m`);
console.log(`Dentro de 50m: ${stats.within50m}`);
console.log(`Dentro de 100m: ${stats.within100m}`);
console.log(`Dentro de 200m: ${stats.within200m}`);
```

---

## 🎯 Exemplo 6: Validar Localização Antes de Salvar

```typescript
import { calculateDistance } from './server/db';

interface LocationUpdate {
  nfcUserId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
}

async function saveLocationIfSignificantChange(
  update: LocationUpdate
): Promise<{ saved: boolean; reason: string }> {
  // Buscar última localização salva
  const lastLocation = await getLatestUserLocation(update.nfcUserId);

  if (!lastLocation) {
    // Primeira localização, sempre salvar
    await createUserLocationUpdate(update);
    return { saved: true, reason: 'Primeira localização' };
  }

  // Calcular distância da última localização
  const distance = calculateDistance(
    parseFloat(lastLocation.latitude),
    parseFloat(lastLocation.longitude),
    update.latitude,
    update.longitude
  );

  // Só salvar se moveu mais de 10 metros
  const minDistance = 10;

  if (distance >= minDistance) {
    await createUserLocationUpdate(update);
    return {
      saved: true,
      reason: `Moveu ${distance.toFixed(2)}m desde última atualização`
    };
  }

  return {
    saved: false,
    reason: `Movimento insignificante (${distance.toFixed(2)}m < ${minDistance}m)`
  };
}

// Uso
const result = await saveLocationIfSignificantChange({
  nfcUserId: 1,
  latitude: -20.4705,
  longitude: -54.6201,
  accuracy: 10
});

console.log(`Salvo: ${result.saved}`);
console.log(`Motivo: ${result.reason}`);
```

---

## 🎯 Exemplo 7: Alertar Quando Usuário Se Aproxima

```typescript
import { calculateDistance } from './server/db';

interface Tag {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
}

interface LocationUpdate {
  userId: number;
  userName: string;
  latitude: number;
  longitude: number;
  previousLatitude?: number;
  previousLongitude?: number;
}

function checkProximityAlert(
  update: LocationUpdate,
  tags: Tag[],
  alertRadius: number
): Array<{ tag: Tag; distance: number; entering: boolean }> {
  const alerts: Array<{ tag: Tag; distance: number; entering: boolean }> = [];

  for (const tag of tags) {
    if (!tag.latitude || !tag.longitude) continue;

    const currentDistance = calculateDistance(
      update.latitude,
      update.longitude,
      parseFloat(tag.latitude),
      parseFloat(tag.longitude)
    );

    // Se tem localização anterior, verificar se está entrando no raio
    if (update.previousLatitude && update.previousLongitude) {
      const previousDistance = calculateDistance(
        update.previousLatitude,
        update.previousLongitude,
        parseFloat(tag.latitude),
        parseFloat(tag.longitude)
      );

      // Entrou no raio?
      if (previousDistance > alertRadius && currentDistance <= alertRadius) {
        alerts.push({
          tag,
          distance: currentDistance,
          entering: true
        });
      }
    } else {
      // Primeira localização, verificar se já está dentro
      if (currentDistance <= alertRadius) {
        alerts.push({
          tag,
          distance: currentDistance,
          entering: true
        });
      }
    }
  }

  return alerts;
}

// Uso
const tags = await getAllTags();
const alertRadius = 150; // Alertar quando entrar em 150m

const update = {
  userId: 1,
  userName: 'João',
  latitude: -20.4705,
  longitude: -54.6201,
  previousLatitude: -20.4720,
  previousLongitude: -54.6201
};

const alerts = checkProximityAlert(update, tags, alertRadius);

for (const alert of alerts) {
  console.log(`🔔 ${update.userName} entrou no raio de ${alert.tag.name}`);
  console.log(`   Distância atual: ${alert.distance.toFixed(2)}m`);
  
  // Enviar notificação push
  await sendPushNotification(update.userId, {
    title: 'Você está próximo!',
    body: `Você está a ${alert.distance.toFixed(0)}m de ${alert.tag.name}`
  });
}
```

---

## 🎯 Exemplo 8: Integração Completa (Preview Sprint 2)

```typescript
import { calculateDistance } from './server/db';
import { ENV } from './server/_core/env';

// Este é um preview de como será usado na Sprint 2

async function processAutomaticCheckinsForSchedule(scheduleId: number) {
  console.log(`[Auto Check-in] Processing schedule ${scheduleId}...`);

  // 1. Buscar agendamento
  const schedule = await getCheckinScheduleById(scheduleId);
  if (!schedule) {
    console.log('[Auto Check-in] Schedule not found');
    return { processed: 0 };
  }

  // 2. Verificar se está ativo
  const now = new Date();
  const isActive = isScheduleActive(schedule, now);
  if (!isActive) {
    console.log('[Auto Check-in] Schedule not active');
    return { processed: 0 };
  }

  // 3. Buscar tags do agendamento
  const tags = await getScheduleTags(scheduleId);
  if (tags.length === 0) {
    console.log('[Auto Check-in] No tags found');
    return { processed: 0 };
  }

  let processedCount = 0;
  const radius = ENV.proximityRadiusMeters;

  // 4. Para cada tag
  for (const tag of tags) {
    if (!tag.latitude || !tag.longitude) continue;

    // 5. Buscar usuários com localização recente
    const usersWithLocation = await getUsersByTagIdWithRecentLocation(tag.id, 30);

    console.log(`[Auto Check-in] Tag ${tag.uid}: ${usersWithLocation.length} users with recent location`);

    // 6. Para cada usuário
    for (const { user, location } of usersWithLocation) {
      // Verificar se já tem check-in hoje
      const hasCheckin = await hasUserCheckinForScheduleToday(
        scheduleId,
        user.id,
        now
      );

      if (hasCheckin) {
        console.log(`[Auto Check-in] User ${user.name} already checked in today`);
        continue;
      }

      // Calcular distância usando nossa função!
      const distance = calculateDistance(
        parseFloat(location.latitude),
        parseFloat(location.longitude),
        parseFloat(tag.latitude),
        parseFloat(tag.longitude)
      );

      console.log(`[Auto Check-in] User ${user.name} is ${distance.toFixed(2)}m from tag ${tag.uid}`);

      // Se dentro do raio, registrar check-in
      if (distance <= radius) {
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
        console.log(`[Auto Check-in] ✅ Check-in registered for ${user.name} (${distance.toFixed(2)}m)`);
      } else {
        console.log(`[Auto Check-in] ❌ User ${user.name} outside radius (${distance.toFixed(2)}m > ${radius}m)`);
      }
    }
  }

  console.log(`[Auto Check-in] Processed ${processedCount} check-ins`);
  return { processed: processedCount };
}
```

---

## 🧪 Testar no Console do Node

```bash
# Entrar no diretório do servidor
cd server

# Abrir Node REPL
node

# Importar função
const { calculateDistance } = require('./db');

# Testar exemplos
const distance1 = calculateDistance(-20.4697, -54.6201, -20.4705, -54.6201);
console.log(`Exemplo 1: ${distance1.toFixed(2)}m`); // ~89m

const distance2 = calculateDistance(-23.5505, -46.6333, -22.9068, -43.1729);
console.log(`Exemplo 2: ${(distance2 / 1000).toFixed(2)}km`); // ~358km

const distance3 = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
console.log(`Exemplo 3: ${(distance3 / 1000).toFixed(2)}km`); // ~344km
```

---

## 📚 Referências

- [Documentação completa: SPRINT1_CHECKIN_PROXIMIDADE.md](./SPRINT1_CHECKIN_PROXIMIDADE.md)
- [Testes unitários: server/__tests__/calculateDistance.test.ts](./server/__tests__/calculateDistance.test.ts)
- [Plano completo: PLANO_CHECKIN_PROXIMIDADE.md](./PLANO_CHECKIN_PROXIMIDADE.md)
