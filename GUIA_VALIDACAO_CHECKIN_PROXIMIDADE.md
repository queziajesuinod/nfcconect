# 🧪 Guia de Validação: Check-in por Proximidade

## 🎯 Objetivo

Este guia fornece **instruções passo a passo** para validar que o sistema de check-in automático por proximidade está funcionando corretamente.

---

## ✅ Pré-requisitos

Antes de começar, certifique-se de que:

- [x] Servidor está rodando (`pnpm dev`)
- [x] Banco de dados está conectado
- [x] Você tem acesso ao dashboard admin
- [x] Você tem pelo menos 1 tag NFC cadastrada com localização
- [x] Você tem pelo menos 1 usuário cadastrado com localização recente

---

## 📋 Teste 1: Validar Inicialização do Cron Job

### Objetivo
Verificar se o cron job inicializa corretamente quando o servidor sobe.

### Passos

1. **Parar o servidor** (se estiver rodando):
   ```bash
   Ctrl + C
   ```

2. **Iniciar o servidor**:
   ```bash
   pnpm dev
   ```

3. **Verificar logs de inicialização**:
   ```
   Server running on http://localhost:3000/
   [Cron] Automatic check-in cron job initialized (every 10 minutes)
   ```

### Resultado Esperado
✅ Log `[Cron] Automatic check-in cron job initialized` aparece

### Se Falhar
❌ Verificar se `node-cron` está instalado:
```bash
pnpm add node-cron
```

---

## 📋 Teste 2: Validar Execução Sem Agendamentos

### Objetivo
Verificar se o cron job pula processamento quando não há agendamentos ativos.

### Passos

1. **Garantir que não há agendamentos ativos**:
   - Acessar dashboard admin → Agendamentos
   - Desativar todos os agendamentos (isActive = false)
   - Ou deletar todos os agendamentos

2. **Aguardar próxima execução do cron**:
   - Verificar horário atual (ex: 14:07)
   - Aguardar até próximo minuto múltiplo de 10 (ex: 14:10)

3. **Verificar logs do servidor**:
   ```
   [Cron] 2025-12-17T14:10:00.000Z - No active schedules, skipping processing
   ```

### Resultado Esperado
✅ Log "No active schedules, skipping processing" aparece  
✅ Nenhum processamento adicional  
✅ Tempo de execução < 100ms

### Se Falhar
❌ Verificar se `getActiveCheckinSchedules()` está retornando array vazio:
```typescript
const schedules = await getActiveCheckinSchedules();
console.log(schedules); // Deve ser []
```

---

## 📋 Teste 3: Validar Agendamento Fora do Horário

### Objetivo
Verificar se o cron job pula processamento quando agendamentos estão fora do horário.

### Passos

1. **Criar agendamento de teste**:
   - Nome: "Teste Manhã"
   - Dias: Todos (0,1,2,3,4,5,6)
   - Horário: 08:00 - 10:00
   - Status: Ativo ✅

2. **Testar fora do horário** (ex: às 14:00):
   - Aguardar próxima execução do cron

3. **Verificar logs**:
   ```
   [Cron] 2025-12-17T14:10:00.000Z - 1 schedule(s) found but none active at current time, skipping processing
   ```

### Resultado Esperado
✅ Log "X schedule(s) found but none active at current time" aparece  
✅ Nenhum check-in registrado  
✅ Tempo de execução < 200ms

### Se Falhar
❌ Verificar função `isScheduleActive()`:
```typescript
const schedule = { daysOfWeek: '0,1,2,3,4,5,6', startTime: '08:00', endTime: '10:00' };
const now = new Date('2025-12-17T14:10:00'); // 14:10
const isActive = isScheduleActive(schedule, now);
console.log(isActive); // Deve ser false
```

---

## 📋 Teste 4: Validar Check-in Automático (Cenário Completo)

### Objetivo
Verificar se o sistema registra check-ins automaticamente quando todas as condições são atendidas.

### Preparação

#### 1. Criar Tag NFC
```
Nome: SALA101
Latitude: -20.4697
Longitude: -54.6201
Raio de Proximidade: 100 metros
```

#### 2. Criar Usuário de Teste
```
Nome: João Silva
Device ID: test-device-123
```

#### 3. Registrar Localização do Usuário
- Acessar: `https://seusite.com/app?device=test-device-123`
- Permitir localização
- Ou inserir manualmente via SQL:
```sql
INSERT INTO user_location_updates (nfcUserId, latitude, longitude, accuracy, deviceInfo, createdAt)
VALUES (1, -20.4705, -54.6201, 10, '{"device": "test"}', NOW());
```

**Distância**: ~89 metros (dentro do raio de 100m)

#### 4. Criar Agendamento
```
Nome: Teste Check-in Automático
Dias: Dia atual (ex: Terça = 2)
Horário: Próximos 30 minutos (ex: agora são 14:05, colocar 14:10-14:40)
Status: Ativo ✅
Tags: SALA101
```

### Execução

1. **Aguardar próxima execução do cron** (próximo minuto múltiplo de 10)

2. **Verificar logs do servidor**:
   ```
   ================================================================================
   [Cron] Starting automatic check-in processing at 2025-12-17T14:10:00.000Z
   [Cron] 1 schedule(s) active at current time
   ================================================================================
   [Cron] Processing schedule: Teste Check-in Automático (ID: 1)
   [Cron] Found 1 tag(s) for schedule
   [Auto Check-in] Processing tag: SALA101 (ID: 5)
   [Auto Check-in] Found 1 users with recent location
   [Auto Check-in] User João Silva is 89m from tag SALA101 (tag radius: 100m, within: true)
   [Auto Check-in] ✅ Check-in registered for user João Silva (ID: 1)
   [Auto Check-in] User added to schedule groups
   ================================================================================
   [Cron] Automatic check-in processing completed
   [Cron] Schedules processed: 1
   [Cron] Total users evaluated: 1
   [Cron] Check-ins registered: 1
   [Cron] Users skipped: 0
   [Cron] Errors: 0
   [Cron] Execution time: 847ms
   ================================================================================
   ```

3. **Verificar dashboard de check-ins**:
   - Acessar: Dashboard Admin → Check-ins
   - Deve aparecer novo check-in:
     - Usuário: João Silva
     - Tag: SALA101
     - Agendamento: Teste Check-in Automático
     - Tipo: Automático
     - Data/Hora: Agora

### Resultado Esperado
✅ Log "Check-in registered for user João Silva" aparece  
✅ Check-in aparece no dashboard  
✅ Usuário adicionado ao grupo do agendamento  
✅ Distância calculada corretamente (~89m)

### Se Falhar

#### Erro: "Found 0 users with recent location"
❌ **Causa**: Usuário não tem localização recente (últimos 30 min)  
✅ **Solução**: Registrar localização do usuário novamente

#### Erro: "User is Xm from tag (within: false)"
❌ **Causa**: Usuário está fora do raio  
✅ **Solução**: 
- Verificar coordenadas da tag
- Verificar coordenadas do usuário
- Aumentar raio da tag
- Ou mover usuário para mais perto

#### Erro: "User already has check-in for this schedule today"
❌ **Causa**: Usuário já tem check-in hoje  
✅ **Solução**: Normal, sistema evita duplicatas

---

## 📋 Teste 5: Validar Raio de Proximidade

### Objetivo
Verificar se o sistema respeita o raio de proximidade de cada tag.

### Cenário A: Usuário Dentro do Raio

```
Tag: SALA101
  Latitude: -20.4697
  Longitude: -54.6201
  Raio: 100m

Usuário: João
  Latitude: -20.4705  (89m de distância)
  Longitude: -54.6201

Resultado esperado: ✅ Check-in registrado
```

### Cenário B: Usuário Fora do Raio

```
Tag: SALA101
  Latitude: -20.4697
  Longitude: -54.6201
  Raio: 100m

Usuário: Maria
  Latitude: -20.4720  (256m de distância)
  Longitude: -54.6201

Resultado esperado: ❌ Check-in NÃO registrado
Log: "User Maria is 256m from tag SALA101 (tag radius: 100m, within: false)"
```

### Como Testar

1. **Criar 2 usuários com localizações diferentes**
2. **Aguardar execução do cron**
3. **Verificar logs**:
   - João: "within: true" → Check-in registrado
   - Maria: "within: false" → Check-in NÃO registrado

---

## 📋 Teste 6: Validar Prevenção de Duplicatas

### Objetivo
Verificar se o sistema evita check-ins duplicados no mesmo dia.

### Passos

1. **Executar Teste 4** (registrar primeiro check-in)

2. **Aguardar próxima execução do cron** (10 minutos depois)

3. **Verificar logs**:
   ```
   [Auto Check-in] User João Silva already has check-in for this schedule today, skipping
   ```

### Resultado Esperado
✅ Log "already has check-in" aparece  
✅ Nenhum check-in duplicado criado  
✅ Apenas 1 check-in por usuário por dia

---

## 📋 Teste 7: Validar Múltiplas Tags

### Objetivo
Verificar se o sistema processa múltiplas tags de um agendamento.

### Passos

1. **Criar 3 tags**:
   - SALA101 (raio 50m)
   - SALA102 (raio 50m)
   - AUDITORIO (raio 150m)

2. **Criar agendamento com as 3 tags**

3. **Criar 3 usuários**:
   - João: perto de SALA101
   - Maria: perto de SALA102
   - Pedro: perto de AUDITORIO

4. **Aguardar execução do cron**

5. **Verificar logs**:
   ```
   [Cron] Found 3 tag(s) for schedule
   [Auto Check-in] Processing tag: SALA101
   [Auto Check-in] ✅ Check-in registered for user João
   [Auto Check-in] Processing tag: SALA102
   [Auto Check-in] ✅ Check-in registered for user Maria
   [Auto Check-in] Processing tag: AUDITORIO
   [Auto Check-in] ✅ Check-in registered for user Pedro
   ```

### Resultado Esperado
✅ 3 tags processadas  
✅ 3 check-ins registrados  
✅ Cada usuário no local correto

---

## 📋 Teste 8: Validar Performance

### Objetivo
Verificar se o sistema processa grandes quantidades de usuários eficientemente.

### Cenário

```
Agendamento: Aula Geral
Tags: 5 tags
Usuários: 100 usuários com localização recente
Raio: 100m
```

### Resultado Esperado
✅ Tempo de execução < 5 segundos  
✅ Todos os usuários dentro do raio recebem check-in  
✅ Logs claros de progresso  
✅ Sem erros

### Métricas Aceitáveis

| Usuários | Tempo Esperado |
|----------|----------------|
| 10       | < 500ms        |
| 50       | < 2s           |
| 100      | < 5s           |
| 500      | < 20s          |

---

## 📋 Teste 9: Validar Tratamento de Erros

### Objetivo
Verificar se o sistema continua funcionando mesmo com erros.

### Cenário A: Tag Sem Localização

```
Tag: SALA_SEM_LOC
  Latitude: null
  Longitude: null
```

**Resultado esperado**: Log de erro, mas continua processando outras tags

### Cenário B: Usuário Sem Localização

```
Usuário: João
  Última localização: 2 horas atrás (fora dos 30 min)
```

**Resultado esperado**: Usuário não aparece na lista, sem erro

### Cenário C: Banco de Dados Indisponível

```
Simular: Parar banco de dados temporariamente
```

**Resultado esperado**: Log de erro, cron continua tentando na próxima execução

---

## 🎯 Checklist Final de Validação

### Funcionalidade Básica
- [ ] Cron job inicializa com servidor
- [ ] Executa a cada 10 minutos
- [ ] Pula quando não há agendamentos
- [ ] Pula quando agendamentos fora do horário
- [ ] Processa quando há agendamentos ativos

### Cálculo de Distância
- [ ] Calcula distância corretamente (Haversine)
- [ ] Respeita raio de cada tag
- [ ] Usuários dentro do raio recebem check-in
- [ ] Usuários fora do raio não recebem check-in

### Validações
- [ ] Evita check-ins duplicados (1 por dia)
- [ ] Verifica localização recente (30 min)
- [ ] Valida dia da semana
- [ ] Valida horário

### Múltiplos Itens
- [ ] Processa múltiplas tags
- [ ] Processa múltiplos usuários
- [ ] Processa múltiplos agendamentos

### Associação Automática
- [ ] Usuários adicionados a grupos do agendamento
- [ ] Links dinâmicos funcionam para grupos

### Logs e Monitoramento
- [ ] Logs de inicialização
- [ ] Logs de execução
- [ ] Logs de check-ins registrados
- [ ] Logs de usuários pulados
- [ ] Logs de erros
- [ ] Logs de resumo final

### Performance
- [ ] Tempo de execução aceitável
- [ ] Não trava o servidor
- [ ] Não sobrecarrega banco de dados

### Robustez
- [ ] Continua funcionando com erros
- [ ] Não quebra com dados inválidos
- [ ] Recupera automaticamente de falhas

---

## 🚀 Próximos Passos

Após validar todos os testes:

1. ✅ **Monitorar em produção**
   - Verificar logs diariamente
   - Acompanhar métricas de performance
   - Ajustar raios se necessário

2. ✅ **Otimizar se necessário**
   - Aumentar intervalo do cron se houver muitos usuários
   - Ajustar timeout de localização recente
   - Adicionar índices no banco de dados

3. ✅ **Implementar Sprint 4** (opcional)
   - Dashboard em tempo real
   - Notificações push
   - Relatórios de presença

---

## 📞 Suporte

Se encontrar problemas durante a validação:

1. **Verificar logs do servidor** (mais detalhados)
2. **Verificar banco de dados** (dados corretos?)
3. **Verificar timezone** (America/Campo_Grande)
4. **Verificar permissões** (usuário pode acessar localização?)

---

## 🎉 Conclusão

Seguindo este guia, você terá **certeza absoluta** de que o sistema de check-in automático por proximidade está funcionando corretamente!

**Tempo estimado de validação**: 30-45 minutos

**Resultado esperado**: 100% dos testes passando ✅

Bons testes! 🚀
