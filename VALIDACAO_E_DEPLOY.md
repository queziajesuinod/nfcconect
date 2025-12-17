# Guia de Validação e Deploy - Correções NFCConnect

## Data: 17 de Dezembro de 2025

---

## ✅ Correções Aplicadas

Foram corrigidos **3 erros críticos** no arquivo `server/db.ts`:

1. **getCheckinStats()** - Linha 647: Operador de comparação corrigido de `<=` para `>=` e uso de `gte()`
2. **getUsersWithRecentLocation()** - Linha 885: Substituído `sql` template por `gte()`
3. **getUsersByTagIdWithRecentLocation()** - Linha 919: Substituído `sql` template por `gte()`

**Arquivo modificado**: `server/db.ts`  
**Diff disponível**: `db_corrections.diff`

---

## 📋 Checklist de Validação

### Fase 1: Validação Local (Obrigatória)

#### 1.1 Preparação do Ambiente
```bash
# Navegar para o diretório do projeto
cd /caminho/para/nfcconect

# Garantir que as dependências estão instaladas
pnpm install

# Verificar se o arquivo .env está configurado
cat .env | grep DATABASE_URL
```

#### 1.2 Iniciar Servidor em Desenvolvimento
```bash
# Windows
pnpm dev:win

# Linux/Mac
pnpm dev
```

**Resultado Esperado**: Servidor iniciado sem erros de sintaxe ou compilação

#### 1.3 Testar Endpoint stats.overview

**Teste via Dashboard Web**:
1. Abrir navegador em `http://localhost:5000` (ou porta configurada)
2. Fazer login como administrador
3. Acessar dashboard de estatísticas
4. Verificar se os dados são carregados sem erro 500

**Teste via API (opcional)**:
```bash
# Obter token de autenticação primeiro (substitua credenciais)
curl -X POST http://localhost:5000/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "senha"}'

# Usar o token retornado para testar stats.overview
curl -X POST http://localhost:5000/api/trpc/stats.overview?batch=1 \
  -H "Content-Type: application/json" \
  -H "Cookie: session=SEU_TOKEN_AQUI" \
  -d '{"0":{"json":null}}'
```

**Resultado Esperado**: 
- ✅ Status 200 OK
- ✅ JSON com estatísticas: `totalTags`, `totalUsers`, `totalConnections`, `totalLinks`, `totalCheckins`, `checkinsToday`
- ✅ Valor de `checkinsToday` deve refletir apenas check-ins de hoje

#### 1.4 Testar Endpoint schedules.triggerCheckin

**Pré-requisitos**:
1. Ter pelo menos um agendamento criado no sistema
2. Ter usuários com localização recente registrada
3. Estar dentro do horário e dia configurado no agendamento

**Teste via Dashboard Web**:
1. Acessar página de agendamentos
2. Clicar em "Executar Check-in" em um agendamento ativo
3. Verificar se o check-in é executado sem erro 500

**Teste via API (opcional)**:
```bash
# Substituir SCHEDULE_ID pelo ID de um agendamento válido
curl -X POST http://localhost:5000/api/trpc/schedules.triggerCheckin?batch=1 \
  -H "Content-Type: application/json" \
  -H "Cookie: session=SEU_TOKEN_AQUI" \
  -d '{"0":{"json":{"scheduleId":1}}}'
```

**Resultado Esperado**:
- ✅ Status 200 OK
- ✅ JSON com resultado do check-in: `success`, `results`, `skipped`
- ✅ Sem erro de query SQL nos logs do servidor

#### 1.5 Verificar Logs do Servidor

**Durante os testes, monitorar os logs para**:
- ❌ Nenhum erro "Failed query" relacionado a `createdAt`
- ❌ Nenhum erro 500 Internal Server Error
- ✅ Queries SQL executadas com sucesso

**Exemplo de log correto**:
```
[Database] Query executed successfully
[API] stats.overview completed in 45ms
[API] schedules.triggerCheckin completed in 120ms
```

---

### Fase 2: Testes de Integração (Recomendada)

#### 2.1 Testar Fluxo Completo de Check-in

1. **Criar novo agendamento**:
   - Definir horário e dias da semana
   - Associar a uma ou mais tags NFC
   - Ativar o agendamento

2. **Registrar localização de usuário**:
   - Usar dispositivo móvel ou simular via API
   - Garantir que a localização está dentro do raio da tag

3. **Executar check-in automático**:
   - Clicar em "Executar Check-in" no agendamento
   - Verificar que usuários elegíveis receberam check-in

4. **Validar resultados**:
   - Verificar histórico de check-ins
   - Confirmar que estatísticas foram atualizadas
   - Validar que não há duplicação de check-ins

#### 2.2 Testar Estatísticas em Diferentes Cenários

1. **Cenário 1: Início do dia**
   - Executar teste logo após meia-noite
   - Verificar que `checkinsToday` é 0 ou reflete apenas check-ins do novo dia

2. **Cenário 2: Durante o dia**
   - Criar vários check-ins ao longo do dia
   - Verificar que `checkinsToday` aumenta corretamente

3. **Cenário 3: Fim do dia**
   - Verificar que check-ins de ontem não são contados em `checkinsToday`

---

### Fase 3: Commit e Push (Após Validação)

#### 3.1 Revisar Mudanças
```bash
# Ver diff das mudanças
git diff server/db.ts

# Ver status do repositório
git status
```

#### 3.2 Commit das Correções
```bash
# Adicionar arquivo modificado
git add server/db.ts

# Criar commit com mensagem descritiva
git commit -m "fix(db): corrigir queries SQL com comparações de timestamp

- Corrigir operador de comparação em getCheckinStats() (linha 647)
- Substituir sql template por gte() em getUsersWithRecentLocation() (linha 885)
- Substituir sql template por gte() em getUsersByTagIdWithRecentLocation() (linha 919)

Resolve erros 500 em:
- stats.overview (Failed query: select count(*) from checkins where createdAt <= $1)
- schedules.triggerCheckin (Failed query: select from user_location_updates where createdAt >= $2)

Refs: DIAGNOSTICO_ERROS.md, CORRECOES_APLICADAS.md"
```

#### 3.3 Push para Repositório Remoto
```bash
# Push para branch atual
git push origin main

# Ou criar branch específica para a correção
git checkout -b fix/timestamp-query-errors
git push origin fix/timestamp-query-errors
```

---

### Fase 4: Deploy em Produção (Após Testes)

#### 4.1 Preparação para Deploy

**Checklist Pré-Deploy**:
- ✅ Todos os testes locais passaram
- ✅ Código commitado e pushed para repositório
- ✅ Backup do banco de dados de produção realizado
- ✅ Plano de rollback preparado (se necessário)

#### 4.2 Deploy via Docker (se aplicável)

```bash
# Build da nova imagem
docker-compose build

# Parar containers atuais
docker-compose down

# Iniciar com nova versão
docker-compose up -d

# Verificar logs
docker-compose logs -f app
```

#### 4.3 Deploy Tradicional

```bash
# No servidor de produção
cd /caminho/para/nfcconect

# Pull das mudanças
git pull origin main

# Instalar dependências (se necessário)
pnpm install

# Build do projeto
pnpm build

# Reiniciar servidor
pm2 restart nfcconect
# ou
systemctl restart nfcconect
```

#### 4.4 Validação Pós-Deploy

**Imediatamente após deploy**:
1. ✅ Verificar que o servidor iniciou sem erros
2. ✅ Acessar dashboard de estatísticas
3. ✅ Executar um check-in automático de teste
4. ✅ Monitorar logs por 5-10 minutos

**Nas primeiras horas**:
1. ✅ Verificar métricas de erro (deve diminuir drasticamente)
2. ✅ Confirmar que usuários não reportam mais erro 500
3. ✅ Validar que estatísticas estão corretas

---

## 🔍 Monitoramento Pós-Deploy

### Métricas a Observar

#### 1. Taxa de Erro HTTP 500
- **Antes**: Alta taxa de erro 500 em `stats.overview` e `schedules.triggerCheckin`
- **Depois**: Taxa de erro 500 deve ser próxima de 0% nesses endpoints

#### 2. Tempo de Resposta
- `stats.overview`: Deve ser < 100ms
- `schedules.triggerCheckin`: Deve ser < 500ms (dependendo do número de usuários)

#### 3. Logs de Erro SQL
- **Antes**: Erros frequentes de "Failed query" com timestamps
- **Depois**: Nenhum erro de query SQL relacionado a timestamps

### Ferramentas de Monitoramento

```bash
# Monitorar logs em tempo real
tail -f /var/log/nfcconect/app.log

# Ou com Docker
docker-compose logs -f app

# Ou com PM2
pm2 logs nfcconect
```

---

## 🚨 Plano de Rollback

**Se problemas forem detectados após deploy**:

### Rollback Rápido via Git
```bash
# Reverter para commit anterior
git revert HEAD
git push origin main

# Ou reset para commit específico (use com cuidado)
git reset --hard COMMIT_ANTERIOR
git push origin main --force

# Rebuild e restart
pnpm build
pm2 restart nfcconect
```

### Rollback via Docker
```bash
# Usar imagem anterior
docker-compose down
docker-compose up -d --build IMAGEM_ANTERIOR
```

---

## 📊 Resultados Esperados

### Antes das Correções
- ❌ Erro 500 em `stats.overview`
- ❌ Erro 500 em `schedules.triggerCheckin`
- ❌ Mensagem: "Failed query: select count(*) from checkins where createdAt <= $1"
- ❌ Mensagem: "Failed query: select from user_location_updates where createdAt >= $2"

### Depois das Correções
- ✅ `stats.overview` retorna estatísticas corretas
- ✅ `schedules.triggerCheckin` executa check-ins automáticos
- ✅ Estatística `checkinsToday` reflete apenas check-ins de hoje
- ✅ Queries SQL executam sem erros
- ✅ Usuários conseguem usar o sistema normalmente

---

## 📞 Suporte e Contato

**Se encontrar problemas durante a validação ou deploy**:

1. Verificar logs detalhados do servidor
2. Consultar `DIAGNOSTICO_ERROS.md` para entender os problemas originais
3. Consultar `CORRECOES_APLICADAS.md` para detalhes técnicos das correções
4. Revisar o diff em `db_corrections.diff`

**Arquivos de Referência**:
- `DIAGNOSTICO_ERROS.md` - Análise detalhada dos erros
- `CORRECOES_APLICADAS.md` - Documentação das correções
- `db_corrections.diff` - Diff das mudanças aplicadas
- `VALIDACAO_E_DEPLOY.md` - Este guia

---

## ✅ Conclusão

As correções aplicadas resolvem os erros críticos de query SQL que causavam falhas 500 nos endpoints de estatísticas e check-in automático. Após validação local e deploy, o sistema deve operar normalmente sem os erros reportados.

**Status**: ✅ Pronto para validação e deploy  
**Risco**: Baixo (correções pontuais e bem definidas)  
**Impacto**: Alto (resolve erros críticos que impedem uso do sistema)

---

**Última Atualização**: 17 de Dezembro de 2025
