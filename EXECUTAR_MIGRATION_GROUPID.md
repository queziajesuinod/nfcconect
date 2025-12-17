# 🔧 Como Executar a Migration para Adicionar groupId

## ❌ Problema Atual

O endpoint `links.list` está retornando erro 500:

```
Failed query: select "id", "nfcUserId", "groupId", ... from "dynamic_links"
```

**Causa**: A coluna `groupId` não existe no banco de dados de produção.

---

## ✅ Solução

Executar a migration SQL que adiciona a coluna `groupId` à tabela `dynamic_links`.

---

## 📝 Passos para Executar

### Opção 1: Via Cliente MySQL/TiDB (Recomendado)

```bash
# 1. Conectar ao banco de dados
mysql -h SEU_HOST -u SEU_USUARIO -p SEU_BANCO

# 2. Executar a migration
source /caminho/para/drizzle/migrations/0013_add_groupid_to_dynamic_links.sql

# 3. Verificar se a coluna foi adicionada
DESCRIBE dynamic_links;

# 4. Verificar a constraint
SHOW CREATE TABLE dynamic_links;
```

---

### Opção 2: Copiar e Colar SQL

**1. Conectar ao banco de dados** (via phpMyAdmin, DBeaver, ou outro cliente)

**2. Executar este SQL**:

```sql
-- Add groupId column (nullable)
ALTER TABLE "dynamic_links" ADD COLUMN "groupId" INTEGER;

-- Make nfcUserId nullable (since links can be for groups OR users)
ALTER TABLE "dynamic_links" ALTER COLUMN "nfcUserId" DROP NOT NULL;

-- Add check constraint to ensure either nfcUserId OR groupId is set (but not both)
ALTER TABLE "dynamic_links" ADD CONSTRAINT "dynamic_links_user_or_group_check" 
  CHECK (
    (nfcUserId IS NOT NULL AND groupId IS NULL) OR 
    (nfcUserId IS NULL AND groupId IS NOT NULL)
  );
```

**3. Verificar**:

```sql
-- Ver estrutura da tabela
DESCRIBE dynamic_links;

-- Deve mostrar:
-- | Field      | Type    | Null | Key | Default | Extra          |
-- |------------|---------|------|-----|---------|----------------|
-- | id         | int     | NO   | PRI | NULL    | auto_increment |
-- | nfcUserId  | int     | YES  |     | NULL    |                |
-- | groupId    | int     | YES  |     | NULL    |                | ← NOVA COLUNA
-- | shortCode  | varchar | NO   | UNI | NULL    |                |
-- | ...        | ...     | ...  | ... | ...     | ...            |
```

---

### Opção 3: Via Drizzle Kit (Se configurado)

```bash
# No diretório do projeto
cd /caminho/para/nfcconect

# Executar migrations pendentes
pnpm drizzle-kit push

# OU
pnpm drizzle-kit migrate
```

---

## 🧪 Como Testar Após Executar

### 1. Reiniciar o servidor

```bash
# Se estiver usando pm2
pm2 restart nfcconect

# Se estiver usando pnpm dev
# Ctrl+C e depois:
pnpm dev
```

### 2. Testar listagem de links

1. Acessar: `https://conecta.iecg.com.br/admin/links`
2. **Resultado esperado**: Lista de links carrega sem erro 500

### 3. Testar criação de link

1. Clicar em "Criar Link"
2. Preencher formulário
3. Selecionar grupo OU usuário individual
4. Clicar em "Criar"
5. **Resultado esperado**: Link criado com sucesso

---

## 📊 Verificação de Sucesso

### Antes da Migration ❌
```
GET /api/trpc/links.list → 500 Internal Server Error
POST /api/trpc/links.create → 500 Internal Server Error
```

### Depois da Migration ✅
```
GET /api/trpc/links.list → 200 OK (lista de links)
POST /api/trpc/links.create → 200 OK (link criado)
```

---

## ⚠️ Importante

### Backup Antes de Executar

```bash
# Fazer backup da tabela dynamic_links
mysqldump -h SEU_HOST -u SEU_USUARIO -p SEU_BANCO dynamic_links > backup_dynamic_links_$(date +%Y%m%d).sql
```

### Rollback (se necessário)

```sql
-- Remover constraint
ALTER TABLE "dynamic_links" DROP CONSTRAINT "dynamic_links_user_or_group_check";

-- Remover coluna groupId
ALTER TABLE "dynamic_links" DROP COLUMN "groupId";

-- Tornar nfcUserId NOT NULL novamente
ALTER TABLE "dynamic_links" ALTER COLUMN "nfcUserId" SET NOT NULL;
```

---

## 🎯 Resultado Esperado

Após executar a migration:

1. ✅ Coluna `groupId` adicionada
2. ✅ Coluna `nfcUserId` agora é nullable
3. ✅ Constraint garante que link tem OU usuário OU grupo
4. ✅ Endpoint `links.list` funciona
5. ✅ Endpoint `links.create` funciona
6. ✅ Sistema de links para grupos operacional

---

## 📞 Suporte

Se encontrar problemas durante a execução:

1. Verificar logs do servidor
2. Verificar se a migration foi aplicada: `DESCRIBE dynamic_links;`
3. Verificar se há dados incompatíveis (links sem nfcUserId e sem groupId)
4. Me enviar os logs de erro para análise

---

**Arquivo de migration**: `drizzle/migrations/0013_add_groupid_to_dynamic_links.sql`
