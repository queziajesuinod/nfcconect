# Sprint 2: Endpoint de Processamento de Check-ins Automáticos

## ✅ Status: COMPLETO

Data de implementação: Dezembro 2025

---

## 🎯 Objetivo

Implementar o endpoint principal que processa check-ins automáticos baseados em proximidade, integrando a função `calculateDistance()` da Sprint 1 com o sistema de agendamentos e localização de usuários.

---

## 📦 O Que Foi Implementado

### 1. **Função `isScheduleActive()`** ✅

**Localização**: `server/db.ts` (linhas 1036-1070)

**Descrição**: Valida se um agendamento está ativo no momento atual baseado em:
- Dia da semana
- Horário de início e fim
- Status do agendamento

**Assinatura**:
```typescript
export function isScheduleActive(schedule: any, now: Date): boolean
```

**Lógica**:
1. Verifica se `schedule.isActive === true`
2. Verifica se dia atual está em `schedule.daysOfWeek`
3. Verifica se horário atual está entre `schedule.startTime` e `schedule.endTime`

**Exemplo**:
```typescript
const schedule = {
  isActive: true,
  daysOfWeek: "1,3,5", // Segunda, Quarta, Sexta
  startTime: "08:00",
  endTime: "10:00"
};

const now = new Date("2025-12-17T09:00:00"); // Quarta, 09:00
const isActive = isScheduleActive(schedule, now);
console.log(isActive); // true
```

---

### 2. **Endpoint `processAutomaticCheckins`** ✅

**Localização**: `server/routers.ts` (linhas 1272-1434)

**Tipo**: Admin mutation

**Input**:
```typescript
{
  scheduleId: number
}
```

**Output**:
```typescript
{
  processed: number,
  message: string,
  details: {
    scheduleName: string,
    tagsProcessed: number,
    usersEvaluated: number,
    usersCheckedIn: number,
    proximityRadius: number,
    checkins: Array<{
      userId: number,
      userName: string,
      tagName: string,
      distance: number,
      withinRadius: boolean
    }>
  }
}
```

**Fluxo de Execução**:

```
1. Buscar agendamento por ID
   ↓
2. Validar se agendamento está ativo (isScheduleActive)
   ↓ (se não ativo, retorna mensagem)
3. Buscar tags associadas ao agendamento
   ↓
4. Para cada tag:
   ├─ Buscar usuários com localização recente (30 min)
   ├─ Para cada usuário:
   │  ├─ Verificar se já fez check-in hoje
   │  ├─ Calcular distância (calculateDistance)
   │  ├─ Se dentro do raio:
   │  │  ├─ Registrar check-in automático
   │  │  └─ Associar a grupos do agendamento
   │  └─ Adicionar aos detalhes
   └─ Próxima tag
   ↓
5. Retornar resultado com estatísticas
```

---

### 3. **Integração com Sistema Existente** ✅

**Funções utilizadas**:
- ✅ `getCheckinScheduleById()` - Buscar agendamento
- ✅ `getScheduleTagRelations()` - Buscar tags do agendamento
- ✅ `getUsersByTagIdWithRecentLocation()` - Buscar usuários próximos
- ✅ `hasUserCheckinForScheduleToday()` - Verificar duplicatas
- ✅ `calculateDistance()` - Calcular distância (Sprint 1)
- ✅ `createAutomaticCheckin()` - Registrar check-in
- ✅ `autoAddUserToScheduleGroups()` - Associar a grupos

**Configurações**:
- ✅ `ENV.proximityRadiusMeters` - Raio de proximidade (padrão: 100m)
- ✅ `getCampoGrandeTime()` - Timezone de Campo Grande MS

---

### 4. **Logs e Monitoramento** ✅

**Logs implementados**:
```typescript
console.log(`[Auto Check-in] Processing schedule ${scheduleId}...`);
console.log('[Auto Check-in] Schedule not found');
console.log('[Auto Check-in] Schedule not active at current time');
console.log('[Auto Check-in] Schedule is active, processing...');
console.log(`[Auto Check-in] Found ${tagRelations.length} tags`);
console.log(`[Auto Check-in] Tag ${tag.uid}: ${usersWithLocation.length} users with recent location`);
console.log(`[Auto Check-in] User ${user.name} already checked in today`);
console.log(`[Auto Check-in] User ${user.name} is ${distance}m from tag ${tag.uid} (radius: ${radius}m, within: ${withinRadius})`);
console.log(`[Auto Check-in] ✅ Check-in registered for ${user.name} (${distance}m)`);
console.log(`[Auto Check-in] ❌ User ${user.name} outside radius (${distance}m > ${radius}m)`);
console.log(`[Auto Check-in] Processed ${processedCount} check-ins`);
```

---

### 5. **Validações e Tratamento de Erros** ✅

**Validações implementadas**:
1. ✅ Agendamento existe
2. ✅ Agendamento está ativo no momento
3. ✅ Tem tags associadas
4. ✅ Tags têm geolocalização
5. ✅ Usuário não tem check-in duplicado
6. ✅ Distância dentro do raio configurado

**Tratamento de erros**:
```typescript
// Agendamento não encontrado
if (!schedule) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
}

// Agendamento não ativo
if (!isActive) {
  return {
    processed: 0,
    message: 'Agendamento não está ativo no momento',
    details: { ... }
  };
}

// Sem tags
if (tagRelations.length === 0) {
  return {
    processed: 0,
    message: 'Nenhuma tag associada ao agendamento'
  };
}

// Erro ao associar grupos (não falha o check-in)
try {
  await autoAddUserToScheduleGroups(user.id, scheduleId);
} catch (error) {
  console.warn(`[Auto Check-in] Error adding user ${user.id} to groups:`, error);
}
```

---

## 🧪 Como Testar

### Teste Manual via Admin

1. **Criar agendamento**:
   ```
   - Tags: Sala 101, Sala 102
   - Dias: Segunda, Quarta, Sexta
   - Horário: 08:00 - 10:00
   - Status: Ativo
   ```

2. **Simular localização de usuários**:
   ```typescript
   // Via endpoint userLocation.update
   {
     deviceId: "device-123",
     latitude: "-20.4705",
     longitude: "-54.6201",
     accuracy: 10
   }
   ```

3. **Executar processamento**:
   ```typescript
   // Via endpoint schedules.processAutomaticCheckins
   {
     scheduleId: 1
   }
   ```

4. **Verificar resultado**:
   ```json
   {
     "processed": 2,
     "message": "2 check-in(s) automático(s) registrado(s)",
     "details": {
       "scheduleName": "Aula de Matemática",
       "tagsProcessed": 2,
       "usersEvaluated": 5,
       "usersCheckedIn": 2,
       "proximityRadius": 100,
       "checkins": [
         {
           "userId": 1,
           "userName": "João Silva",
           "tagName": "Sala 101",
           "distance": 89,
           "withinRadius": true
         },
         {
           "userId": 2,
           "userName": "Maria Santos",
           "tagName": "Sala 102",
           "distance": 45,
           "withinRadius": true
         }
       ]
     }
   }
   ```

---

### Teste de Cenários

#### Cenário 1: Agendamento Ativo ✅
```typescript
// Agendamento: Segunda 08:00-10:00
// Hora atual: Segunda 09:00
// Resultado: Processa check-ins
```

#### Cenário 2: Agendamento Inativo (Horário) ❌
```typescript
// Agendamento: Segunda 08:00-10:00
// Hora atual: Segunda 11:00
// Resultado: "Agendamento não está ativo no momento"
```

#### Cenário 3: Agendamento Inativo (Dia) ❌
```typescript
// Agendamento: Segunda, Quarta, Sexta
// Hora atual: Terça 09:00
// Resultado: "Agendamento não está ativo no momento"
```

#### Cenário 4: Usuário Dentro do Raio ✅
```typescript
// Raio: 100m
// Distância: 89m
// Resultado: Check-in registrado
```

#### Cenário 5: Usuário Fora do Raio ❌
```typescript
// Raio: 100m
// Distância: 150m
// Resultado: Não registra check-in, mas adiciona aos detalhes
```

#### Cenário 6: Check-in Duplicado ❌
```typescript
// Usuário já fez check-in hoje
// Resultado: Pula usuário, não registra novamente
```

---

## 📊 Métricas e Performance

### Performance Esperada

| Operação | Tempo Estimado |
|----------|----------------|
| Validar agendamento | < 10ms |
| Buscar tags | < 50ms |
| Buscar usuários (por tag) | < 100ms |
| Calcular distância (por usuário) | < 1ms |
| Registrar check-in | < 50ms |
| **Total (10 usuários, 2 tags)** | **< 500ms** |

### Escalabilidade

| Cenário | Usuários | Tags | Tempo Estimado |
|---------|----------|------|----------------|
| Pequeno | 10 | 2 | < 500ms |
| Médio | 50 | 5 | < 2s |
| Grande | 100 | 10 | < 5s |
| Muito Grande | 500 | 20 | < 20s |

---

## 🔍 Logs de Exemplo

### Execução Bem-Sucedida

```
[Auto Check-in] Processing schedule 1...
[Auto Check-in] Schedule is active, processing...
[Auto Check-in] Found 2 tags
[Auto Check-in] Tag SALA101: 3 users with recent location
[Auto Check-in] User João Silva is 89m from tag SALA101 (radius: 100m, within: true)
[Auto Check-in] ✅ Check-in registered for João Silva (89m)
[Auto Check-in] User Maria Santos is 45m from tag SALA101 (radius: 100m, within: true)
[Auto Check-in] ✅ Check-in registered for Maria Santos (45m)
[Auto Check-in] User Pedro Costa is 150m from tag SALA101 (radius: 100m, within: false)
[Auto Check-in] ❌ User Pedro Costa outside radius (150m > 100m)
[Auto Check-in] Tag SALA102: 2 users with recent location
[Auto Check-in] User João Silva already checked in today
[Auto Check-in] User Ana Lima is 60m from tag SALA102 (radius: 100m, within: true)
[Auto Check-in] ✅ Check-in registered for Ana Lima (60m)
[Auto Check-in] Processed 3 check-ins
```

### Agendamento Inativo

```
[Auto Check-in] Processing schedule 1...
[Auto Check-in] Schedule not active at current time
```

---

## 🎓 Casos de Uso

### Caso 1: Aula Presencial

**Configuração**:
- Agendamento: "Aula de Matemática"
- Tags: Sala 101
- Dias: Segunda, Quarta, Sexta
- Horário: 08:00 - 10:00
- Raio: 50m

**Fluxo**:
1. Alunos chegam na sala (08:00)
2. App sincroniza localização automaticamente
3. Sistema processa check-ins a cada 5 minutos
4. Alunos dentro de 50m são registrados
5. Professora visualiza presença em tempo real

---

### Caso 2: Evento no Auditório

**Configuração**:
- Agendamento: "Palestra de Tecnologia"
- Tags: Auditório Principal
- Dias: Quinta
- Horário: 14:00 - 16:00
- Raio: 100m

**Fluxo**:
1. Participantes chegam no auditório (14:00)
2. Sistema processa check-ins automaticamente
3. Organizadores veem lista de presença
4. Certificados gerados automaticamente

---

### Caso 3: Múltiplas Salas

**Configuração**:
- Agendamento: "Prova Final"
- Tags: Sala 101, 102, 103, 104
- Dias: Sexta
- Horário: 10:00 - 12:00
- Raio: 50m

**Fluxo**:
1. Alunos distribuídos em 4 salas
2. Sistema processa todas as salas simultaneamente
3. Evita check-in duplicado (mesmo aluno, múltiplas tags)
4. Relatório unificado de presença

---

## 🔐 Segurança e Privacidade

### Dados Armazenados

**Check-in automático**:
```typescript
{
  scheduleId: number,
  nfcUserId: number,
  tagId: number,
  userLatitude: string,      // Localização no momento do check-in
  userLongitude: string,     // Localização no momento do check-in
  distanceMeters: number,    // Distância calculada
  isWithinRadius: boolean,   // Se estava dentro do raio
  scheduledDate: Date,       // Data do agendamento
  periodStart: string,       // Horário de início
  periodEnd: string,         // Horário de fim
  checkinTime: Date,         // Momento exato do check-in
  status: string,            // 'completed' ou 'failed'
  errorMessage: string       // Motivo de falha (se houver)
}
```

### Privacidade

- ✅ Localização armazenada apenas durante período do agendamento
- ✅ Dados de localização não são compartilhados
- ✅ Usuário pode desabilitar localização a qualquer momento
- ✅ Histórico de localização pode ser apagado

---

## 🚀 Próximos Passos

### Sprint 3: Cron Job Automático (2-3 dias)

**Objetivo**: Executar `processAutomaticCheckins` automaticamente a cada 5 minutos.

**Tarefas**:
1. ⏳ Configurar cron job (node-cron)
2. ⏳ Processar todos os agendamentos ativos
3. ⏳ Logs e monitoramento
4. ⏳ Tratamento de erros e retry

---

### Sprint 4: Dashboard e Notificações (3-4 dias)

**Objetivo**: Interface para visualizar check-ins automáticos e notificar usuários.

**Tarefas**:
1. ⏳ Dashboard de check-ins automáticos
2. ⏳ Notificações push quando check-in é registrado
3. ⏳ Relatórios de presença
4. ⏳ Estatísticas de proximidade

---

## 📚 Referências

- [Sprint 1: Função calculateDistance()](./SPRINT1_CHECKIN_PROXIMIDADE.md)
- [Plano Completo](./PLANO_CHECKIN_PROXIMIDADE.md)
- [Exemplos de Uso](./EXEMPLO_USO_CALCULATEDISTANCE.md)
- [Testes Unitários Sprint 1](./server/__tests__/calculateDistance.test.ts)

---

## ✅ Checklist de Implementação

### Código
- [x] Função `isScheduleActive()` implementada
- [x] Endpoint `processAutomaticCheckins` implementado
- [x] Integração com `calculateDistance()`
- [x] Integração com sistema de localização
- [x] Validação de duplicatas
- [x] Associação automática a grupos
- [x] Imports e exports corretos

### Logs e Monitoramento
- [x] Logs de início de processamento
- [x] Logs de validação de agendamento
- [x] Logs de busca de tags
- [x] Logs de busca de usuários
- [x] Logs de cálculo de distância
- [x] Logs de check-ins registrados
- [x] Logs de usuários fora do raio
- [x] Logs de total processado

### Validações
- [x] Agendamento existe
- [x] Agendamento está ativo
- [x] Tags associadas existem
- [x] Tags têm geolocalização
- [x] Usuário não tem check-in duplicado
- [x] Distância dentro do raio

### Tratamento de Erros
- [x] Agendamento não encontrado
- [x] Agendamento inativo
- [x] Sem tags associadas
- [x] Erro ao associar grupos (não falha check-in)

### Documentação
- [x] Documentação completa (este arquivo)
- [x] Exemplos de uso
- [x] Casos de teste
- [x] Logs de exemplo

---

## 🎉 Conclusão

A Sprint 2 está **100% completa** e pronta para uso! O endpoint `processAutomaticCheckins` integra perfeitamente com a função `calculateDistance()` da Sprint 1 e fornece uma base sólida para o sistema de check-in automático por proximidade.

**Próximo passo**: Implementar Sprint 3 (Cron Job Automático) para executar o processamento automaticamente a cada 5 minutos.
