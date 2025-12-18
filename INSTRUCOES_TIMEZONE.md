# Instruções para Configuração do Timezone do Amazonas

## ✅ O que foi feito

Todo o sistema foi configurado para usar o **Horário Padrão do Amazonas (UTC-4 / America/Manaus)** de forma consistente:

1. ✅ Criadas funções utilitárias centralizadas em `server/utils/timezone.ts`
2. ✅ Atualizadas todas as operações de data/hora no backend
3. ✅ Configurado o servidor Node.js para usar timezone do Amazonas
4. ✅ Configurado o cron job de check-ins automáticos
5. ✅ Corrigido o erro na página de check-in

## 🔧 Próximos Passos - IMPORTANTE

### 1. Reiniciar o Servidor

**OBRIGATÓRIO**: Você precisa reiniciar o servidor para aplicar as mudanças:

```bash
# Se estiver usando pm2:
pm2 restart nfcconect

# Se estiver usando pnpm dev:
# Pare o servidor (Ctrl+C) e inicie novamente:
pnpm dev
```

### 2. Configurar Timezone no Banco de Dados PostgreSQL/TiDB

Execute os seguintes comandos SQL no seu banco de dados:

```sql
-- Configurar timezone para a sessão atual
SET TIME ZONE 'America/Manaus';

-- Verificar se foi aplicado
SHOW timezone;
-- Deve retornar: America/Manaus
```

**Para configuração permanente**, edite o arquivo `postgresql.conf`:

```conf
# Adicione ou altere esta linha:
timezone = 'America/Manaus'
```

Depois reinicie o PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### 3. Configurar Variável de Ambiente (Opcional mas Recomendado)

Adicione no seu arquivo `.env` ou configuração do pm2:

```bash
TZ=America/Manaus
```

**Para pm2**, você pode configurar assim:

```bash
pm2 delete nfcconect
pm2 start server/_core/index.ts --name nfcconect --interpreter ts-node --env TZ=America/Manaus
```

Ou crie um arquivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'nfcconect',
    script: 'server/_core/index.ts',
    interpreter: 'ts-node',
    env: {
      TZ: 'America/Manaus',
      NODE_ENV: 'production'
    }
  }]
};
```

E inicie com:

```bash
pm2 start ecosystem.config.js
```

## 🧪 Como Testar

### 1. Verificar Timezone do Servidor

Adicione temporariamente este código em qualquer endpoint:

```typescript
import { getTimezoneInfo } from './utils/timezone';
console.log(getTimezoneInfo());
```

Você deve ver algo como:

```json
{
  "timezone": "America/Manaus (Amazon Standard Time)",
  "offset": "UTC-4",
  "systemTime": "2024-01-15T14:30:00.000Z",
  "amazonTime": "2024-01-15T10:30:00.000Z",
  "dayOfWeek": 1,
  "minutesSinceMidnight": 630
}
```

### 2. Verificar Check-ins

1. Acesse a página de check-in no admin
2. Verifique se não há mais erros 500
3. Verifique se as estatísticas estão carregando corretamente
4. Verifique se os horários dos check-ins estão no timezone correto

### 3. Verificar Cron Job

O cron job de check-ins automáticos agora roda no timezone do Amazonas. Verifique os logs:

```bash
pm2 logs nfcconect
```

Você deve ver mensagens como:

```
[Cron] Starting automatic check-in processing at 2024-01-15T10:30:00.000Z
```

## 📋 Checklist de Verificação

- [ ] Servidor reiniciado (pm2 restart ou pnpm dev)
- [ ] Timezone configurado no banco de dados PostgreSQL/TiDB
- [ ] Variável de ambiente TZ configurada (opcional)
- [ ] Página de check-in carregando sem erros
- [ ] Estatísticas mostrando dados corretos
- [ ] Horários dos check-ins no timezone correto
- [ ] Cron job executando no horário correto

## 🐛 Solução de Problemas

### Erro: "Received an instance of Date"

Se ainda aparecer este erro:
1. Certifique-se de que reiniciou o servidor
2. Limpe o cache do navegador (Ctrl+Shift+R)
3. Verifique os logs do servidor para outros erros

### Horários Incorretos

Se os horários ainda estiverem incorretos:
1. Verifique se o timezone do banco de dados está configurado
2. Verifique se a variável TZ está configurada
3. Reinicie o servidor E o banco de dados

### Cron Job Não Executando

Se o cron job não estiver executando no horário correto:
1. Verifique os logs: `pm2 logs nfcconect`
2. Verifique se o timezone está configurado no código do cron
3. Reinicie o servidor

## 📚 Documentação Adicional

Consulte o arquivo `TIMEZONE_CONFIG.md` para documentação técnica completa sobre:
- Funções utilitárias disponíveis
- Exemplos de uso
- Configuração avançada
- Migração de dados existentes

## 💡 Dicas Importantes

1. **Sempre use as funções utilitárias** de `server/utils/timezone.ts`
2. **Nunca use `new Date()` diretamente** no código do servidor
3. **Sempre converta Date para ISO string** antes de usar em queries SQL
4. **Teste com diferentes horários** para garantir consistência
5. **Mantenha o timezone consistente** em servidor, banco e cron jobs

## 🆘 Suporte

Se tiver problemas ou dúvidas:
1. Verifique os logs do servidor: `pm2 logs nfcconect`
2. Verifique os logs do banco de dados
3. Consulte a documentação em `TIMEZONE_CONFIG.md`
4. Teste as funções utilitárias com `getTimezoneInfo()`
