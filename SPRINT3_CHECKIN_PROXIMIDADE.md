# Sprint 3: Cron Job Automático para Check-ins por Proximidade

## ✅ Status: COMPLETO

Data de implementação: Dezembro 2025

---

## 🎯 Objetivo

Implementar cron job automático que executa o processamento de check-ins por proximidade **a cada 10 minutos** para todos os agendamentos ativos, sem necessidade de intervenção manual.

---

## 📦 O Que Foi Implementado

### 1. **Serviço de Cron Job** ✅

**Localização**: `server/services/automaticCheckinCron.ts`

**Componentes**:
- ✅ `processScheduleCheckins()` - Processa um agendamento específico
- ✅ `processAllActiveSchedules()` - Processa todos os agendamentos ativos
- ✅ `startAutomaticCheckinCron()` - Inicializa o cron job
- ✅ `stopAutomaticCheckinCron()` - Para o cron job (para testes/shutdown)

---

### 2. **Configuração do Cron** ⏰

**Expressão Cron**: `*/10 * * * *`

**Significado**:
- `*/10` - A cada 10 minutos
- `*` - Toda hora
- `*` - Todo dia
- `*` - Todo mês
- `*` - Todo dia da semana

**Timezone**: `America/Campo_Grande` (UTC-4)

**Frequência**: **A cada 10 minutos** (6 execuções por hora, 144 por dia)

---

### 3. **Integração com Servidor** ✅

**Localização**: `server/_core/index.ts`

**Inicialização**:
```typescript
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
  
  // Inicializar cron job de check-ins automáticos
  console.log('\n' + '='.repeat(80));
  startAutomaticCheckinCron();
  console.log('='.repeat(80) + '\n');
});
```

**Comportamento**:
- ✅ Inicia automaticamente quando o servidor sobe
- ✅ Executa em background sem bloquear o servidor
- ✅ Continua executando enquanto o servidor estiver rodando
- ✅ Para automaticamente quando o servidor é desligado

---

## 🔄 Fluxo Completo

```
1. Servidor inicia
   ↓
2. Cron job é inicializado
   ↓
3. A cada 10 minutos:
   ├─ Buscar todos os agendamentos ativos
   ├─ Para cada agendamento:
   │  ├─ Verificar se está ativo no momento (dia e horário)
   │  ├─ Se ativo:
   │  │  ├─ Buscar tags do agendamento
   │  │  ├─ Para cada tag:
   │  │  │  ├─ Buscar usuários com localização recente (30 min)
   │  │  │  ├─ Para cada usuário:
   │  │  │  │  ├─ Verificar se já fez check-in hoje
   │  │  │  │  ├─ Calcular distância
   │  │  │  │  ├─ Se dentro do raio:
   │  │  │  │  │  ├─ Registrar check-in automático
   │  │  │  │  │  └─ Associar a grupos
   │  │  │  │  └─ Próximo usuário
   │  │  │  └─ Próxima tag
   │  │  └─ Próximo agendamento
   │  └─ Se não ativo, pular
   └─ Aguardar 10 minutos
   ↓
4. Repetir passo 3
```

---

## 📊 Logs Detalhados

### Log de Inicialização

```
================================================================================
[Cron] Initializing automatic check-in cron job...
[Cron] Schedule: Every 10 minutes (*/10 * * * *)
[Cron] Automatic check-in cron job started successfully
[Cron] Next execution will be in 10 minutes
================================================================================
```

---

### Log de Execução Completa

```
================================================================================
[Cron] Starting automatic check-in processing at 2025-12-17T14:00:00.000Z
================================================================================
[Cron] Found 3 active schedules

[Cron] Processing schedule 1 (Aula de Matemática)...
[Cron] Found 2 tags for schedule 1

[Cron] Tag SALA101: 5 users with recent location
[Cron] ✅ Check-in registered for João Silva at SALA101 (25m, radius: 30m)
[Cron] ✅ Check-in registered for Maria Santos at SALA101 (28m, radius: 30m)

[Cron] Tag SALA102: 3 users with recent location
[Cron] ✅ Check-in registered for Pedro Costa at SALA102 (45m, radius: 50m)

[Cron] Schedule 1 complete: 3 processed, 5 skipped, 0 errors

[Cron] Processing schedule 2 (Palestra de Tecnologia)...
[Cron] Found 1 tags for schedule 2

[Cron] Tag AUDITORIO: 10 users with recent location
[Cron] ✅ Check-in registered for Ana Lima at AUDITORIO (89m, radius: 100m)
[Cron] ✅ Check-in registered for Carlos Souza at AUDITORIO (95m, radius: 100m)

[Cron] Schedule 2 complete: 2 processed, 8 skipped, 0 errors

[Cron] Schedule 3 (Reunião Semanal) is not active at current time, skipping

================================================================================
[Cron] Automatic check-in processing complete
[Cron] Schedules processed: 2/3
[Cron] Check-ins registered: 5
[Cron] Users skipped: 13
[Cron] Errors: 0
[Cron] Duration: 1234ms
================================================================================
```

---

### Log de Erro

```
[Cron] Error processing user 123: Error: Database connection lost
[Cron] Error processing schedule 2: Error: Tag not found
[Cron] Fatal error in automatic check-in processing: Error: ...
```

---

## 🎯 Cenários de Uso

### Cenário 1: Aula Presencial (08:00 - 10:00)

**Configuração**:
- Agendamento: "Aula de Matemática"
- Dias: Segunda, Quarta, Sexta
- Horário: 08:00 - 10:00
- Tags: Sala 101 (raio 30m)

**Fluxo**:
```
08:00 - Aula começa, alunos chegam
08:00 - Cron executa, registra primeiros check-ins
08:10 - Cron executa, registra alunos que chegaram atrasados
08:20 - Cron executa, não registra novos (todos já fizeram check-in)
...
10:00 - Aula termina
10:10 - Cron executa, agendamento não está mais ativo, pula
```

---

### Cenário 2: Evento de Dia Inteiro (09:00 - 17:00)

**Configuração**:
- Agendamento: "Conferência Anual"
- Dias: Quinta
- Horário: 09:00 - 17:00
- Tags: Auditório (raio 100m)

**Fluxo**:
```
09:00 - Evento começa
09:00 - Cron registra participantes presentes
09:10 - Cron registra novos participantes
...
12:00 - Intervalo para almoço
12:10 - Cron não registra novos (todos já fizeram check-in)
...
17:00 - Evento termina
17:10 - Cron não processa mais (agendamento inativo)
```

---

### Cenário 3: Múltiplos Agendamentos Simultâneos

**Configuração**:
- Agendamento 1: Aula A (Sala 101, 08:00-10:00)
- Agendamento 2: Aula B (Sala 102, 08:00-10:00)
- Agendamento 3: Palestra (Auditório, 10:00-12:00)

**Fluxo**:
```
08:00 - Cron processa Aula A e Aula B simultaneamente
08:10 - Cron processa Aula A e Aula B novamente
...
10:00 - Aula A e B terminam, Palestra começa
10:00 - Cron processa apenas Palestra
10:10 - Cron processa apenas Palestra
...
```

---

## ⚙️ Configuração

### Alterar Frequência do Cron

**Arquivo**: `server/services/automaticCheckinCron.ts`

```typescript
// A cada 10 minutos (padrão)
const cronExpression = '*/10 * * * *';

// A cada 5 minutos
const cronExpression = '*/5 * * * *';

// A cada 15 minutos
const cronExpression = '*/15 * * * *';

// A cada 30 minutos
const cronExpression = '*/30 * * * *';

// A cada hora
const cronExpression = '0 * * * *';
```

---

### Executar Imediatamente na Inicialização

**Arquivo**: `server/services/automaticCheckinCron.ts`

```typescript
// Descomentar esta linha para executar na inicialização
processAllActiveSchedules().catch(console.error);
```

**Uso**: Útil para testar ou garantir que check-ins sejam processados imediatamente ao subir o servidor.

---

### Desabilitar Cron Job

**Opção 1**: Comentar a inicialização

**Arquivo**: `server/_core/index.ts`

```typescript
// Comentar estas linhas:
// console.log('\n' + '='.repeat(80));
// startAutomaticCheckinCron();
// console.log('='.repeat(80) + '\n');
```

**Opção 2**: Variável de ambiente

**Arquivo**: `.env`

```
ENABLE_AUTO_CHECKIN_CRON=false
```

**Arquivo**: `server/services/automaticCheckinCron.ts`

```typescript
export function startAutomaticCheckinCron() {
  if (process.env.ENABLE_AUTO_CHECKIN_CRON === 'false') {
    console.log('[Cron] Automatic check-in cron job is disabled');
    return null;
  }
  // ... resto do código
}
```

---

## 🧪 Como Testar

### Teste 1: Verificar Inicialização

1. **Iniciar servidor**:
   ```bash
   pnpm dev
   ```

2. **Verificar logs**:
   ```
   Server running on http://localhost:3000/
   
   ================================================================================
   [Cron] Initializing automatic check-in cron job...
   [Cron] Schedule: Every 10 minutes (*/10 * * * *)
   [Cron] Automatic check-in cron job started successfully
   [Cron] Next execution will be in 10 minutes
   ================================================================================
   ```

---

### Teste 2: Aguardar Execução Automática

1. **Aguardar 10 minutos**

2. **Verificar logs de execução**:
   ```
   ================================================================================
   [Cron] Starting automatic check-in processing at ...
   ================================================================================
   [Cron] Found X active schedules
   ...
   [Cron] Check-ins registered: X
   ...
   ================================================================================
   ```

---

### Teste 3: Forçar Execução Imediata

1. **Descomentar linha no código**:
   ```typescript
   // Em server/services/automaticCheckinCron.ts
   processAllActiveSchedules().catch(console.error);
   ```

2. **Reiniciar servidor**:
   ```bash
   pnpm dev
   ```

3. **Verificar execução imediata nos logs**

---

### Teste 4: Simular Cenário Completo

1. **Criar agendamento de teste**:
   - Nome: "Teste Cron"
   - Dias: Hoje
   - Horário: Próximos 30 minutos
   - Tag: Com geolocalização

2. **Criar usuário de teste com localização**:
   - Localização recente (< 30 min)
   - Dentro do raio da tag

3. **Aguardar próxima execução do cron** (máximo 10 min)

4. **Verificar check-in registrado**:
   - Via logs do servidor
   - Via admin dashboard
   - Via banco de dados

---

## 📈 Performance e Escalabilidade

### Métricas Esperadas

| Cenário | Agendamentos | Tags | Usuários | Tempo Estimado |
|---------|--------------|------|----------|----------------|
| **Pequeno** | 1-3 | 2-5 | 10-30 | < 1s |
| **Médio** | 5-10 | 10-20 | 50-100 | < 5s |
| **Grande** | 10-20 | 20-50 | 100-500 | < 15s |
| **Muito Grande** | 20-50 | 50-100 | 500-1000 | < 30s |

---

### Otimizações Implementadas

1. ✅ **Validação Prévia**
   - Verifica se agendamento está ativo antes de processar
   - Pula agendamentos inativos imediatamente

2. ✅ **Verificação de Duplicatas**
   - Verifica se usuário já fez check-in antes de calcular distância
   - Economiza processamento

3. ✅ **Localização Recente**
   - Busca apenas usuários com localização dos últimos 30 minutos
   - Reduz queries desnecessárias

4. ✅ **Processamento Sequencial**
   - Processa um agendamento por vez
   - Evita sobrecarga do banco de dados

5. ✅ **Tratamento de Erros**
   - Erros em um agendamento não afetam os outros
   - Continua processando mesmo com falhas

---

### Recomendações de Frequência

| Tipo de Uso | Frequência Recomendada | Motivo |
|-------------|------------------------|--------|
| **Aulas curtas** (< 1h) | **5 minutos** | Capturar alunos atrasados |
| **Aulas médias** (1-2h) | **10 minutos** | Balanceamento ideal |
| **Eventos longos** (> 2h) | **15 minutos** | Economia de recursos |
| **Eventos de dia inteiro** | **30 minutos** | Check-in único suficiente |
| **Alta carga** (> 1000 usuários) | **15-30 minutos** | Evitar sobrecarga |

---

## 🔍 Monitoramento

### Logs a Observar

1. **Inicialização**:
   ```
   [Cron] Automatic check-in cron job started successfully
   ```

2. **Execuções**:
   ```
   [Cron] Check-ins registered: X
   ```

3. **Erros**:
   ```
   [Cron] Error processing schedule X: ...
   [Cron] Fatal error in automatic check-in processing: ...
   ```

4. **Performance**:
   ```
   [Cron] Duration: Xms
   ```

---

### Métricas Importantes

| Métrica | Valor Ideal | Ação se Fora do Ideal |
|---------|-------------|------------------------|
| **Duration** | < 5s | Aumentar intervalo do cron |
| **Errors** | 0 | Investigar logs de erro |
| **Check-ins registered** | > 0 | Verificar configuração de agendamentos |
| **Schedules processed** | > 0 | Verificar se há agendamentos ativos |

---

## 🚀 Dependências

### Pacotes Instalados

```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

---

## 📚 Referências

- [Sprint 1: Função calculateDistance()](./SPRINT1_CHECKIN_PROXIMIDADE.md)
- [Sprint 2: Endpoint processAutomaticCheckins](./SPRINT2_CHECKIN_PROXIMIDADE.md)
- [Melhoria: Raio por Tag](./MELHORIA_RAIO_POR_TAG.md)
- [Plano Completo](./PLANO_CHECKIN_PROXIMIDADE.md)
- [node-cron Documentation](https://github.com/node-cron/node-cron)

---

## ✅ Checklist de Implementação

### Código
- [x] Instalar node-cron e @types/node-cron
- [x] Criar serviço automaticCheckinCron.ts
- [x] Implementar processScheduleCheckins()
- [x] Implementar processAllActiveSchedules()
- [x] Implementar startAutomaticCheckinCron()
- [x] Implementar stopAutomaticCheckinCron()
- [x] Integrar com server/_core/index.ts
- [x] Configurar timezone America/Campo_Grande
- [x] Configurar frequência a cada 10 minutos

### Logs
- [x] Log de inicialização
- [x] Log de cada execução
- [x] Log de agendamentos encontrados
- [x] Log de processamento por tag
- [x] Log de check-ins registrados
- [x] Log de usuários pulados
- [x] Log de erros
- [x] Log de resumo com estatísticas
- [x] Log de duração

### Validações
- [x] Verificar agendamento ativo
- [x] Verificar tags com geolocalização
- [x] Verificar usuários com localização recente
- [x] Verificar duplicatas de check-in
- [x] Verificar distância dentro do raio

### Tratamento de Erros
- [x] Erro ao processar usuário
- [x] Erro ao processar agendamento
- [x] Erro fatal no cron
- [x] Continuar processando após erro

### Documentação
- [x] Documentação completa (este arquivo)
- [x] Exemplos de logs
- [x] Cenários de uso
- [x] Configurações
- [x] Testes
- [x] Performance e escalabilidade
- [x] Monitoramento

---

## 🎉 Conclusão

A Sprint 3 está **100% completa**! O sistema de check-in por proximidade agora funciona **completamente automatizado**:

### Sprints Completas

- ✅ **Sprint 1**: Função calculateDistance() (Haversine)
- ✅ **Sprint 2**: Endpoint processAutomaticCheckins
- ✅ **Sprint 3**: Cron Job Automático (a cada 10 minutos)

### Sistema Completo

O sistema agora:
1. ✅ Calcula distâncias com precisão (Haversine)
2. ✅ Processa check-ins por proximidade
3. ✅ Executa automaticamente a cada 10 minutos
4. ✅ Usa raio específico de cada tag
5. ✅ Associa usuários a grupos automaticamente
6. ✅ Evita check-ins duplicados
7. ✅ Logs detalhados de monitoramento
8. ✅ Tratamento robusto de erros

---

## 🎊 Próximos Passos (Opcional)

### Sprint 4: Dashboard e Notificações

**Objetivo**: Interface para visualizar check-ins automáticos e notificar usuários.

**Tarefas**:
1. ⏳ Dashboard de check-ins automáticos
2. ⏳ Notificações push quando check-in é registrado
3. ⏳ Relatórios de presença
4. ⏳ Estatísticas de proximidade

---

Sistema de check-in por proximidade **100% funcional e automatizado**! 🚀🎉
